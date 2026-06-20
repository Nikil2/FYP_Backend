import { PrismaService } from '../../../../prisma/prisma.service';
import { WorkersService } from '../../workers/workers.service';
import { ServicesService } from '../../services/services.service';
import { LlmProvider } from '../providers/llm-provider.interface';

/**
 * Everything a tool implementation may need. The executor injects these once
 * and passes them to each tool function, so tools stay plain functions (easy to
 * unit-test) rather than NestJS providers.
 */
export interface ToolDeps {
  prisma: PrismaService;
  workersService: WorkersService;
  servicesService: ServicesService;
  llm: LlmProvider;
}

/** Slim, customer-safe worker shape returned to the frontend (no phone/CNIC). */
export interface AiWorker {
  workerId: string;
  fullName: string;
  profilePicUrl?: string | null;
  city?: string | null;
  averageRating: number;
  totalJobsCompleted: number;
  visitingCharges: number;
  rankingScore: number;
  services: { id: number; name: string }[];
  reason?: string;
}

/**
 * Uniform return shape from every tool. `data` is JSON-stringified back to the
 * LLM; `workers` / `action` are surfaced by the agent loop to the frontend.
 */
export interface ToolResult {
  data: Record<string, any>;
  workers?: AiWorker[];
  action?: string | null;
}
