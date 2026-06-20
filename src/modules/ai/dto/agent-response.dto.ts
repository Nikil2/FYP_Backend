import { AiWorker } from '../tools/tool-types';

export class AgentResponseDto {
  /** Natural-language reply shown in the chat bubble. */
  reply: string;

  /** Name of the last tool the agent used, if any (for UI hints / debugging). */
  toolUsed?: string | null;

  /** Real workers to render as cards under the reply (search/recommend). */
  workers?: AiWorker[];

  /** Optional frontend navigation, e.g. "redirect:/customer/book/2?workerId=ab". */
  action?: string | null;
}
