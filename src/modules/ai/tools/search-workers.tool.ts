import { VerificationStatus } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AiWorker, ToolDeps, ToolResult } from './tool-types';
import { toAiWorker } from './worker-mapper';

export interface WorkerQuery {
  service: string;
  city?: string;
  maxBudget?: number;
  minRating?: number;
  limit?: number;
}

/**
 * Shared candidate query used by both search_workers and recommend_workers.
 * Returns verified workers matching the service (and optional city/budget/
 * rating), already mapped + sorted by rankingScore desc.
 */
export async function findCandidateWorkers(
  prisma: PrismaService,
  q: WorkerQuery,
): Promise<AiWorker[]> {
  const where: any = {
    verificationStatus: VerificationStatus.APPROVED,
    services: {
      some: {
        service: { name: { contains: q.service, mode: 'insensitive' } },
      },
    },
  };

  // City may live in the new `city` column or inside the free-text homeAddress.
  if (q.city) {
    where.OR = [
      { city: { contains: q.city, mode: 'insensitive' } },
      { homeAddress: { contains: q.city, mode: 'insensitive' } },
    ];
  }

  if (typeof q.maxBudget === 'number') {
    where.visitingCharges = { lte: q.maxBudget };
  }

  if (typeof q.minRating === 'number') {
    where.averageRating = { gte: q.minRating };
  }

  const profiles = await prisma.workerProfile.findMany({
    where,
    include: {
      user: true,
      services: { include: { service: true } },
    },
    take: 25, // fetch a pool, then rank + slice
  });

  return profiles
    .map(toAiWorker)
    .sort((a, b) => b.rankingScore - a.rankingScore)
    .slice(0, q.limit ?? 5);
}

/**
 * Tool: search_workers — natural worker lookup. Returns up to 5 real workers.
 */
export async function searchWorkers(
  deps: ToolDeps,
  args: { service: string; city?: string; maxBudget?: number; minRating?: number },
): Promise<ToolResult> {
  const workers = await findCandidateWorkers(deps.prisma, {
    service: args.service,
    city: args.city,
    maxBudget: args.maxBudget,
    minRating: args.minRating,
    limit: 5,
  });

  return {
    data: {
      count: workers.length,
      workers: workers.map((w) => ({
        workerId: w.workerId,
        fullName: w.fullName,
        city: w.city,
        averageRating: w.averageRating,
        totalJobsCompleted: w.totalJobsCompleted,
        visitingCharges: w.visitingCharges,
        services: w.services.map((s) => s.name),
      })),
      note:
        workers.length === 0
          ? 'No verified workers matched. Suggest relaxing budget or trying another city.'
          : undefined,
    },
    workers,
  };
}
