import { Injectable, Logger } from '@nestjs/common';
import { AiMessageRole } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Persists AI conversations and agentic search logs.
 *
 * Persistence is best-effort: a DB hiccup must never break a live chat reply,
 * so every method swallows its own errors and logs a warning. The agent loop
 * stays fast and resilient; analytics just lose one row on failure.
 */
@Injectable()
export class AiPersistenceService {
  private readonly logger = new Logger(AiPersistenceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Return an existing conversation id (if valid) or create a fresh one.
   * `userId` is stored only when it maps to a real user (FK-safe).
   */
  async ensureConversation(
    conversationId: string | undefined,
    userId: string | undefined,
    kind = 'CUSTOMER',
  ): Promise<string | null> {
    try {
      if (conversationId) {
        const existing = await this.prisma.aiConversation.findUnique({
          where: { id: conversationId },
          select: { id: true },
        });
        if (existing) return existing.id;
      }

      const safeUserId = await this.resolveUserId(userId);
      const created = await this.prisma.aiConversation.create({
        data: { userId: safeUserId, kind },
        select: { id: true },
      });
      return created.id;
    } catch (err: any) {
      this.logger.warn(`ensureConversation failed: ${err?.message}`);
      return null;
    }
  }

  async saveMessage(
    conversationId: string | null,
    role: AiMessageRole,
    content: string,
    opts?: { toolUsed?: string | null; metadata?: any },
  ): Promise<void> {
    if (!conversationId) return;
    try {
      await this.prisma.aiChatMessage.create({
        data: {
          conversationId,
          role,
          content: content ?? '',
          toolUsed: opts?.toolUsed ?? null,
          metadata: opts?.metadata ?? undefined,
        },
      });
      // Touch the conversation so updatedAt reflects latest activity.
      await this.prisma.aiConversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });
    } catch (err: any) {
      this.logger.warn(`saveMessage failed: ${err?.message}`);
    }
  }

  /** Log an agentic worker search/recommendation for analytics + evaluation. */
  async logRecommendation(entry: {
    userId?: string;
    query: string;
    parsedService?: string;
    parsedCity?: string;
    parsedBudget?: number;
    workerIds: string[];
    toolUsed: string;
  }): Promise<void> {
    try {
      const safeUserId = await this.resolveUserId(entry.userId);
      await this.prisma.aiRecommendationLog.create({
        data: {
          userId: safeUserId,
          query: entry.query,
          parsedService: entry.parsedService ?? null,
          parsedCity: entry.parsedCity ?? null,
          parsedBudget: entry.parsedBudget?.toString() ?? null,
          workerIds: entry.workerIds,
          toolUsed: entry.toolUsed,
        },
      });
    } catch (err: any) {
      this.logger.warn(`logRecommendation failed: ${err?.message}`);
    }
  }

  /** Only return a userId that actually exists, to satisfy the FK. */
  private async resolveUserId(
    userId: string | undefined,
  ): Promise<string | null> {
    if (!userId) return null;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    return user?.id ?? null;
  }
}
