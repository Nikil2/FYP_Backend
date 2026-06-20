import { ToolDeps, ToolResult } from './tool-types';

/**
 * Tool: get_worker_detail — full public profile of one worker.
 * Reuses WorkersService.getWorkerById, then strips sensitive fields
 * (phone, CNIC) before returning to the AI / frontend.
 */
export async function getWorkerDetail(
  deps: ToolDeps,
  args: { workerId: string },
): Promise<ToolResult> {
  try {
    const w = await deps.workersService.getWorkerById(args.workerId);

    return {
      data: {
        worker: {
          workerId: w.workerId,
          fullName: w.fullName,
          profilePicUrl: w.profilePicUrl,
          bio: w.bio,
          city: (w as any).city ?? null,
          experienceYears: w.experienceYears,
          averageRating: w.averageRating,
          totalJobsCompleted: w.totalJobsCompleted,
          visitingCharges: w.visitingCharges,
          verificationStatus: w.verificationStatus,
          services: w.services?.map((s) => ({ id: s.id, name: s.name })),
          portfolioCount: w.portfolio?.length ?? 0,
        },
      },
    };
  } catch {
    return {
      data: { error: `No worker found with id ${args.workerId}.` },
    };
  }
}
