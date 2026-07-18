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

  /**
   * The customer's current coordinates, supplied by the frontend on the request.
   *
   * Deliberately ambient rather than a tool argument: the model has no way to
   * know real GPS coordinates, so exposing lat/lng in the tool schema would just
   * invite it to invent them. The model decides *whether* proximity matters; the
   * actual position always comes from the device.
   */
  customerLocation?: { lat: number; lng: number };
}

/**
 * Per-request context passed into the executor alongside the LLM's arguments.
 * Values here come from the client/device, never from the model.
 */
export interface ToolContext {
  customerLocation?: { lat: number; lng: number };
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
  services: { id: number; name: string; price: number }[];
  reason?: string;
  /** Distance from the customer, in km. Only set when location was supplied. */
  distanceKm?: number;
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
