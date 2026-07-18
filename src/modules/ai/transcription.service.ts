import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import Groq, { toFile } from 'groq-sdk';

/**
 * Speech-to-text via Groq Whisper. Used by the worker onboarding chat so
 * low-literacy workers can SPEAK their answers (Urdu / Roman-Urdu) instead of
 * typing. Whisper auto-detects the language and returns the transcript text.
 */
@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);
  private readonly client: Groq;
  private readonly model: string;

  constructor() {
    this.client = new Groq({
      apiKey: process.env.GROQ_API_KEY,
      timeout: Number(process.env.AI_REQUEST_TIMEOUT_MS ?? 30000),
    });
    this.model = process.env.GROQ_WHISPER_MODEL ?? 'whisper-large-v3-turbo';
  }

  /** Transcribe an uploaded audio clip to text. */
  async transcribe(file: {
    buffer: Buffer;
    originalname?: string;
    mimetype?: string;
  }): Promise<string> {
    if (!file?.buffer?.length) {
      throw new InternalServerErrorException('No audio received.');
    }

    try {
      const audio = await toFile(file.buffer, file.originalname ?? 'audio.webm', {
        type: file.mimetype ?? 'audio/webm',
      });

      const result = await this.client.audio.transcriptions.create({
        file: audio,
        model: this.model,
        // No `language` set → Whisper auto-detects English / Urdu / Roman-Urdu.
        temperature: 0,
      });

      return (result.text ?? '').trim();
    } catch (err: any) {
      this.logger.error(`Transcription failed: ${err?.message}`);
      throw new InternalServerErrorException(
        'Could not understand the audio. Please try again or type your answer.',
      );
    }
  }
}
