import { ToolDeps, ToolResult, AiWorker } from './tool-types';
import { findCandidateWorkers } from './search-workers.tool';

/**
 * Tool: recommend_workers — the recommendation engine.
 *
 * 1. Fetch verified candidates matching service + city (+ optional budget).
 * 2. They arrive already ranked by the deterministic rankingScore.
 * 3. Ask the LLM to write ONE short reason per worker (single batched call),
 *    so the ranking stays trustworthy and only the explanation is generated.
 */
export async function recommendWorkers(
  deps: ToolDeps,
  args: { service: string; city: string; budget?: number; urgency?: string },
): Promise<ToolResult> {
  const workers = await findCandidateWorkers(deps.prisma, {
    service: args.service,
    city: args.city,
    maxBudget: args.budget,
    limit: 3,
  });

  if (workers.length === 0) {
    return {
      data: {
        count: 0,
        note: 'No verified workers matched. Suggest another city or higher budget.',
      },
      workers: [],
    };
  }

  await attachReasons(deps, workers, args);

  return {
    data: {
      count: workers.length,
      recommendations: workers.map((w, i) => ({
        rank: i + 1,
        workerId: w.workerId,
        fullName: w.fullName,
        averageRating: w.averageRating,
        totalJobsCompleted: w.totalJobsCompleted,
        visitingChargesPkr: w.visitingCharges,
        services: w.services.map((s) => ({ name: s.name, pricePkr: s.price })),
        reason: w.reason,
      })),
    },
    workers,
  };
}

/** Generate a one-line "why recommended" per worker via a single LLM call. */
async function attachReasons(
  deps: ToolDeps,
  workers: AiWorker[],
  args: { service: string; city: string; budget?: number },
): Promise<void> {
  const facts = workers
    .map(
      (w, i) =>
        `${i + 1}. ${w.fullName} — rating ${w.averageRating}/5, ` +
        `${w.totalJobsCompleted} jobs, PKR ${w.visitingCharges}`,
    )
    .join('\n');

  const budgetLine = args.budget ? ` Customer budget: PKR ${args.budget}.` : '';

  try {
    const res = await deps.llm.chat({
      temperature: 0.5,
      maxTokens: 300,
      messages: [
        {
          role: 'system',
          content:
            'You write very short recommendation reasons for home-service ' +
            'workers in Pakistan. Reply ONLY with a JSON array of strings, one ' +
            'reason per worker in order. Each reason max 15 words, friendly, ' +
            'referencing rating/jobs/price. No extra text.',
        },
        {
          role: 'user',
          content:
            `Service: ${args.service} in ${args.city}.${budgetLine}\n` +
            `Workers:\n${facts}\n\nReturn the JSON array of reasons.`,
        },
      ],
    });

    const reasons = parseReasonArray(res.content);
    workers.forEach((w, i) => {
      w.reason = reasons[i] ?? defaultReason(w);
    });
  } catch {
    // LLM failed — fall back to deterministic reasons so the tool still works.
    workers.forEach((w) => (w.reason = defaultReason(w)));
  }
}

function parseReasonArray(content: string | null): string[] {
  if (!content) return [];
  try {
    // Strip code fences / surrounding prose, grab the first JSON array.
    const match = content.match(/\[[\s\S]*\]/);
    const arr = JSON.parse(match ? match[0] : content);
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
}

function defaultReason(w: AiWorker): string {
  return `${w.averageRating}/5 rating, ${w.totalJobsCompleted} jobs done, PKR ${w.visitingCharges} per visit.`;
}
