import { Inject, Injectable, Logger } from '@nestjs/common';
import { LLM_PROVIDER, LlmProvider, ChatMessage } from './providers/llm-provider.interface';
import { ToolExecutor } from './tools/tool-executor';
import { TOOL_DEFINITIONS } from './tools/tool-definitions';
import { CUSTOMER_SYSTEM_PROMPT } from './prompts/system-prompt';
import { AgentRequestDto } from './dto/agent-request.dto';
import { AgentResponseDto } from './dto/agent-response.dto';
import { AiWorker } from './tools/tool-types';

/**
 * The agentic loop.
 *
 * On each turn we send the conversation + tool catalogue to the LLM. If it
 * asks for tools, we execute them, feed the results back, and loop — up to
 * AI_MAX_TOOL_ROUNDS — until the model produces a final text answer. Workers
 * and any navigation action surfaced by tools are collected and returned to
 * the frontend alongside the reply.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly maxRounds = Number(process.env.AI_MAX_TOOL_ROUNDS ?? 3);

  constructor(
    @Inject(LLM_PROVIDER) private readonly llm: LlmProvider,
    private readonly toolExecutor: ToolExecutor,
  ) {}

  async runAgent(dto: AgentRequestDto): Promise<AgentResponseDto> {
    const messages: ChatMessage[] = [
      { role: 'system', content: CUSTOMER_SYSTEM_PROMPT },
      ...this.buildHistory(dto.history),
      { role: 'user', content: dto.message },
    ];

    let collectedWorkers: AiWorker[] = [];
    let action: string | null = null;
    let lastToolUsed: string | null = null;

    for (let round = 0; round < this.maxRounds; round++) {
      const result = await this.llm.chat({
        messages,
        tools: TOOL_DEFINITIONS,
      });

      // No tool calls → the model gave its final answer.
      if (!result.toolCalls?.length) {
        return {
          reply: result.content ?? "Sorry, I couldn't generate a response.",
          toolUsed: lastToolUsed,
          workers: collectedWorkers,
          action,
        };
      }

      // Record the assistant's tool request, then execute every call.
      messages.push(result.assistantMessage);

      for (const call of result.toolCalls) {
        lastToolUsed = call.name;
        const toolResult = await this.toolExecutor.run(call.name, call.arguments);

        if (toolResult.workers?.length) {
          collectedWorkers = toolResult.workers; // latest search/recommend wins
        }
        if (toolResult.action) {
          action = toolResult.action;
        }

        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          name: call.name,
          content: JSON.stringify(toolResult.data),
        });
      }
      // Loop: the model now reads the tool results and responds (or calls more).
    }

    // Hit the round cap — ask once more with no tools for a clean text answer.
    const final = await this.llm.chat({ messages, tools: [] });
    return {
      reply:
        final.content ??
        'I found some results but had trouble summarising. Please try again.',
      toolUsed: lastToolUsed,
      workers: collectedWorkers,
      action,
    };
  }

  /** Keep only the last 10 turns, stripped to role+content, to control tokens. */
  private buildHistory(history?: AgentRequestDto['history']): ChatMessage[] {
    if (!history?.length) return [];
    return history
      .slice(-10)
      .map((t) => ({ role: t.role, content: t.content }));
  }
}
