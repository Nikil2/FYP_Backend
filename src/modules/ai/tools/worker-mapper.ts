import { AiWorker } from './tool-types';

/**
 * Weighted ranking score — mirrors WorkersService.calculateRankingScore
 * (PDF section 6): rating 40%, jobs 30%, response 20% (neutral default),
 * repeat 10% (not tracked yet). Kept here so tools can rank raw Prisma rows
 * without depending on a private method.
 */
export function rankingScore(worker: {
  averageRating: any;
  totalJobsCompleted: number;
}): number {
  const ratingScore = parseFloat(String(worker.averageRating ?? 0)) / 5;
  const jobsScore = Math.min((worker.totalJobsCompleted ?? 0) / 200, 1);
  const responseScore = 0.6; // neutral until response time is tracked
  const repeatScore = 0; // until repeat-customer rate is tracked

  const score =
    0.4 * ratingScore +
    0.3 * jobsScore +
    0.2 * responseScore +
    0.1 * repeatScore;

  return Math.round(score * 1000) / 1000;
}

/**
 * Map a Prisma workerProfile (with `user` and `services.service` included) to
 * the slim, customer-safe AiWorker shape. Never leaks phone/CNIC.
 */
export function toAiWorker(profile: any): AiWorker {
  return {
    workerId: profile.id,
    fullName: profile.user?.fullName ?? 'Worker',
    profilePicUrl: profile.user?.profilePicUrl ?? null,
    city: profile.city ?? null,
    averageRating: parseFloat(String(profile.averageRating ?? 0)),
    totalJobsCompleted: profile.totalJobsCompleted ?? 0,
    visitingCharges: parseFloat(String(profile.visitingCharges ?? 0)),
    rankingScore: rankingScore(profile),
    services: (profile.services ?? []).map((ws: any) => ({
      id: ws.service.id,
      name: ws.service.name,
    })),
  };
}
