import { VerificationStatus } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { getWorkerDistancesWithinRadius } from '../../../shared/utils/geo.util';
import { AiWorker, ToolDeps, ToolResult } from './tool-types';
import { toAiWorker } from './worker-mapper';

/** Default search radius when the customer's location is known. */
export const AI_DEFAULT_RADIUS_KM = 15;

export interface WorkerQuery {
  service: string;
  city?: string;
  maxBudget?: number;
  minRating?: number;
  limit?: number;
  /** Customer coordinates — when present, results are filtered and sorted by distance. */
  location?: { lat: number; lng: number };
  radiusKm?: number;
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
        // The AI sends a top-level category (e.g. "Electrician", "AC
        // Technician"), but Service.name holds granular sub-services
        // ("Wiring & Rewiring"). Match the category first, fall back to the
        // sub-service name so both "Electrician" and "Leak Repair" work.
        service: {
          OR: [
            { categoryName: { contains: q.service, mode: 'insensitive' } },
            { name: { contains: q.service, mode: 'insensitive' } },
          ],
        },
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

  // When we know where the customer is, proximity beats a free-text city match:
  // restrict to workers within the radius and rank by distance instead of score.
  let distanceById: Map<string, number> | null = null;

  if (q.location) {
    distanceById = await getWorkerDistancesWithinRadius(
      prisma,
      q.location.lat,
      q.location.lng,
      q.radiusKm ?? AI_DEFAULT_RADIUS_KM,
    );

    if (distanceById.size === 0) return [];

    where.id = { in: Array.from(distanceById.keys()) };
    // The radius is a stronger signal than the city string, and the two can
    // contradict each other ("Karachi" vs coordinates in Clifton).
    delete where.OR;
  }

  const profiles = await prisma.workerProfile.findMany({
    where,
    include: {
      user: true,
      services: { include: { service: true } },
    },
    take: 25, // fetch a pool, then rank + slice
  });

  const workers = profiles.map((profile) => {
    const worker = toAiWorker(profile);
    if (distanceById) {
      worker.distanceKm = distanceById.get(profile.id);
    }
    return worker;
  });

  const sorted = distanceById
    ? workers.sort(
        (a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity),
      )
    : workers.sort((a, b) => b.rankingScore - a.rankingScore);

  return sorted.slice(0, q.limit ?? 5);
}

/**
 * Tool: search_workers — natural worker lookup. Returns up to 5 real workers.
 */
export async function searchWorkers(
  deps: ToolDeps,
  args: {
    service: string;
    city?: string;
    maxBudget?: number;
    minRating?: number;
    radiusKm?: number;
  },
): Promise<ToolResult> {
  const usedLocation = !!deps.customerLocation;
  const radiusKm = args.radiusKm ?? AI_DEFAULT_RADIUS_KM;

  const workers = await findCandidateWorkers(deps.prisma, {
    service: args.service,
    city: args.city,
    maxBudget: args.maxBudget,
    minRating: args.minRating,
    limit: 5,
    location: deps.customerLocation,
    radiusKm,
  });

  return {
    data: {
      count: workers.length,
      searchedNearCustomer: usedLocation,
      radiusKm: usedLocation ? radiusKm : undefined,
      workers: workers.map((w) => ({
        workerId: w.workerId,
        fullName: w.fullName,
        city: w.city,
        averageRating: w.averageRating,
        totalJobsCompleted: w.totalJobsCompleted,
        // Visiting charge is the fixed call-out fee; each service has its own
        // price. Send both so the model can quote accurate pricing.
        visitingChargesPkr: w.visitingCharges,
        distanceKm: w.distanceKm,
        services: w.services.map((s) => ({ name: s.name, pricePkr: s.price })),
      })),
      note:
        workers.length === 0
          ? usedLocation
            ? `No verified workers within ${radiusKm} km. Offer to widen the search area.`
            : 'No verified workers matched. Suggest relaxing budget or trying another city.'
          : undefined,
    },
    workers,
  };
}
