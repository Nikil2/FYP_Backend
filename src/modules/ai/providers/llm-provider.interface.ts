/**
 * Provider-agnostic LLM contract.
 *
 * Both GroqProvider (cloud) and OllamaProvider (local) implement this, so the
 * agent loop in ai.service.ts never cares which backend is answering. Message
 * and tool shapes follow the OpenAI/Groq chat-completions format, which Ollama
 * also exposes via its /v1 compatibility endpoint.
 */

export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ChatMessage {
  role: ChatRole;
  content: string | null;
  /** Present on assistant messages that request tool calls. */
  tool_calls?: RawToolCall[];
  /** Required on `role: 'tool'` messages — links the result to its request. */
  tool_call_id?: string;
  /** Optional label for tool messages (the tool name). */
  name?: string;
}

/** Raw tool call as returned by the LLM (arguments are a JSON string). */
export interface RawToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/** Parsed tool call handed to the executor (arguments already JSON-parsed). */
export interface ParsedToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

/** A function/tool definition advertised to the model. */
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>; // JSON Schema
  };
}

export interface ChatRequest {
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResult {
  /** Final assistant text, or null when the model only asked for tools. */
  content: string | null;
  /** Tool calls the model wants executed (empty/undefined when none). */
  toolCalls?: ParsedToolCall[];
  /** The raw assistant message to push back into the conversation. */
  assistantMessage: ChatMessage;
}

export interface LlmProvider {
  chat(request: ChatRequest): Promise<ChatResult>;
}

/** DI token used to inject whichever provider AI_PROVIDER selects. */
export const LLM_PROVIDER = Symbol('LLM_PROVIDER');
