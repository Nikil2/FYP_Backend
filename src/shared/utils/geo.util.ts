import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Return a map of workerProfileId -> distanceKm for every APPROVED worker whose
 * home location falls within `radiusKm` of (lat, lng).
 *
 * Uses a cheap bounding-box pre-filter (indexable) followed by the Haversine
 * great-circle formula for exact distance. The acos argument is clamped to
 * [-1, 1] to avoid NaN from floating-point rounding on near-identical points.
 *
 * Shared by the customer worker search and the AI worker tools so both apply
 * identical distance semantics.
 */
export async function getWorkerDistancesWithinRadius(
  prisma: PrismaService,
  lat: number,
  lng: number,
  radiusKm: number,
): Promise<Map<string, number>> {
  const EARTH_RADIUS_KM = 6371;
  const KM_PER_DEG_LAT = 111.045;
  const latDelta = radiusKm / KM_PER_DEG_LAT;
  // Guard against the cos() term collapsing to 0 near the poles.
  const lngDelta =
    radiusKm /
    (KM_PER_DEG_LAT * Math.max(Math.cos((lat * Math.PI) / 180), 0.01));

  const rows = await prisma.$queryRaw<{ id: string; distance_km: number }[]>(
    Prisma.sql`
      SELECT id, distance_km FROM (
        SELECT
          id,
          ${EARTH_RADIUS_KM} * acos(
            LEAST(1, GREATEST(-1,
              cos(radians(${lat})) * cos(radians("homeLat")) *
              cos(radians("homeLng") - radians(${lng})) +
              sin(radians(${lat})) * sin(radians("homeLat"))
            ))
          ) AS distance_km
        FROM "WorkerProfile"
        WHERE "verificationStatus" = 'APPROVED'
          AND "homeLat" BETWEEN ${lat - latDelta} AND ${lat + latDelta}
          AND "homeLng" BETWEEN ${lng - lngDelta} AND ${lng + lngDelta}
      ) AS candidates
      WHERE distance_km <= ${radiusKm}
      ORDER BY distance_km ASC
    `,
  );

  return new Map(
    rows.map((row) => [row.id, Math.round(Number(row.distance_km) * 10) / 10]),
  );
}
