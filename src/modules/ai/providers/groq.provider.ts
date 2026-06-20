import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import Groq from 'groq-sdk';
import {
  ChatRequest,
  ChatResult,
  ChatMessage,
  LlmProvider,
  ParsedToolCall,
} from './llm-provider.interface';

/**
 * Groq cloud provider (default).
 *
 * Uses the official groq-sdk. The SDK auto-reads GROQ_API_KEY / GROQ_BASE_URL
 * from env and appends `/openai/v1` itself — so GROQ_BASE_URL must be the bare
 * host (https://api.groq.com), never include the path, or requests 404.
 */
@Injectable()
export class GroqProvider implements LlmProvider {
  private readonly logger = new Logger(GroqProvider.name);
  private readonly client: Groq;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor() {
    this.client = new Groq({
      apiKey: process.env.GROQ_API_KEY,
      timeout: Number(process.env.AI_REQUEST_TIMEOUT_MS ?? 30000),
    });
    this.model = process.env.GROQ_MODEL ?? 'llama-3.1-8b-instant';
    this.timeoutMs = Number(process.env.AI_REQUEST_TIMEOUT_MS ?? 30000);
  }

  async chat(request: ChatRequest): Promise<ChatResult> {
    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: request.messages as any,
        tools: request.tools as any,
        tool_choice: request.tools?.length ? 'auto' : undefined,
        temperature: request.temperature ?? 0.4,
        max_tokens: request.maxTokens ?? 1024,
      });

      const choice = completion.choices[0]?.message;
      if (!choice) {
        throw new InternalServerErrorException('Groq returned no message');
      }

      const toolCalls: ParsedToolCall[] = (choice.tool_calls ?? []).map(
        (tc) => ({
          id: tc.id,
          name: tc.function.name,
          arguments: this.safeParse(tc.function.arguments),
        }),
      );

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: choice.content ?? null,
        tool_calls: choice.tool_calls as any,
      };

      return {
        content: choice.content ?? null,
        toolCalls,
        assistantMessage,
      };
    } catch (err: any) {
      this.logger.error(
        `Groq chat failed (status ${err?.status}): ${err?.message}`,
      );
      throw new InternalServerErrorException(
        'AI service is temporarily unavailable. Please try again.',
      );
    }
  }

  /** Tool arguments come back as a JSON string; never let a bad parse crash. */
  private safeParse(raw: string): Record<string, any> {
    try {
      return raw ? JSON.parse(raw) : {};
    } catch {
      this.logger.warn(`Could not parse tool arguments: ${raw}`);
      return {};
    }
  }
}
