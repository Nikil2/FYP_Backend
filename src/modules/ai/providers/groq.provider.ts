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
      return await this.call(request, !!request.tools?.length);
    } catch (err: any) {
      // Smaller models (e.g. llama-3.1-8b) sometimes emit a malformed tool
      // call that Groq rejects with 400 tool_use_failed. Retry once WITHOUT
      // tools so the user still gets a plain text answer instead of an error.
      if (this.isToolUseFailed(err) && request.tools?.length) {
        this.logger.warn('Groq tool_use_failed — retrying without tools');
        try {
          return await this.call(request, false);
        } catch (retryErr: any) {
          this.logger.error(`Groq retry failed: ${retryErr?.message}`);
        }
      }

      this.logger.error(
        `Groq chat failed (status ${err?.status}): ${err?.message}`,
      );
      throw new InternalServerErrorException(
        'AI service is temporarily unavailable. Please try again.',
      );
    }
  }

  /** One Groq call. `withTools=false` strips tools to force a text answer. */
  private async call(
    request: ChatRequest,
    withTools: boolean,
  ): Promise<ChatResult> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: request.messages as any,
      tools: withTools ? (request.tools as any) : undefined,
      tool_choice: withTools ? 'auto' : undefined,
      temperature: request.temperature ?? 0.4,
      max_tokens: request.maxTokens ?? 1024,
    });

    const choice = completion.choices[0]?.message;
    if (!choice) {
      throw new InternalServerErrorException('Groq returned no message');
    }

    const toolCalls: ParsedToolCall[] = (choice.tool_calls ?? []).map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: this.safeParse(tc.function.arguments),
    }));

    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: choice.content ?? null,
      tool_calls: choice.tool_calls as any,
    };

    return { content: choice.content ?? null, toolCalls, assistantMessage };
  }

  /** True when Groq rejected a badly-formatted tool call (400 tool_use_failed). */
  private isToolUseFailed(err: any): boolean {
    if (err?.status !== 400) return false;
    const code = err?.error?.error?.code ?? err?.code;
    return (
      code === 'tool_use_failed' ||
      String(err?.message ?? '').includes('tool_use_failed')
    );
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
