import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import {
  ChatRequest,
  ChatResult,
  ChatMessage,
  LlmProvider,
  ParsedToolCall,
} from './llm-provider.interface';

/**
 * Local Ollama provider (fallback / privacy-sensitive tasks).
 *
 * Talks to Ollama's OpenAI-compatible endpoint (`/v1/chat/completions`) with
 * plain fetch — same message + tool shape as Groq, so the agent loop is
 * unchanged. Selected when AI_PROVIDER=ollama. The model must support tools
 * (e.g. llama3.1, qwen2.5).
 */
@Injectable()
export class OllamaProvider implements LlmProvider {
  private readonly logger = new Logger(OllamaProvider.name);
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL ?? 'llama3.1';
    this.timeoutMs = Number(process.env.AI_REQUEST_TIMEOUT_MS ?? 30000);
  }

  async chat(request: ChatRequest): Promise<ChatResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          messages: request.messages,
          tools: request.tools,
          tool_choice: request.tools?.length ? 'auto' : undefined,
          temperature: request.temperature ?? 0.4,
          max_tokens: request.maxTokens ?? 1024,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Ollama ${res.status}: ${text}`);
      }

      const data = await res.json();
      const choice = data.choices?.[0]?.message;
      if (!choice) {
        throw new InternalServerErrorException('Ollama returned no message');
      }

      const toolCalls: ParsedToolCall[] = (choice.tool_calls ?? []).map(
        (tc: any) => ({
          id: tc.id,
          name: tc.function.name,
          arguments: this.safeParse(tc.function.arguments),
        }),
      );

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: choice.content ?? null,
        tool_calls: choice.tool_calls,
      };

      return { content: choice.content ?? null, toolCalls, assistantMessage };
    } catch (err: any) {
      this.logger.error(`Ollama chat failed: ${err?.message}`);
      throw new InternalServerErrorException(
        'Local AI service is unavailable. Please try again.',
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private safeParse(raw: any): Record<string, any> {
    if (raw && typeof raw === 'object') return raw; // Ollama may return an object
    try {
      return raw ? JSON.parse(raw) : {};
    } catch {
      this.logger.warn(`Could not parse tool arguments: ${raw}`);
      return {};
    }
  }
}
