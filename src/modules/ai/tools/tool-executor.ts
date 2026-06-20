import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { WorkersService } from '../../workers/workers.service';
import { ServicesService } from '../../services/services.service';
import { LLM_PROVIDER, LlmProvider } from '../providers/llm-provider.interface';
import { TOOL_NAMES } from './tool-definitions';
import { ToolDeps, ToolResult } from './tool-types';
import { searchWorkers } from './search-workers.tool';
import { recommendWorkers } from './recommend-workers.tool';
import { getServiceCategories } from './get-categories.tool';
import { getWorkerDetail } from './get-worker-detail.tool';
import { initiateBooking } from './initiate-booking.tool';
import { getPlatformInfo } from './get-platform-info.tool';

/**
 * Maps an LLM tool call (name + parsed arguments) to its real implementation.
 *
 * Injected services are bundled into `ToolDeps` once and passed to every tool,
 * keeping the tool functions plain and testable. Unknown tools and thrown
 * errors are caught here so a single bad call never breaks the agent loop —
 * the model receives an error payload and can recover.
 */
@Injectable()
export class ToolExecutor {
  private readonly logger = new Logger(ToolExecutor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workersService: WorkersService,
    private readonly servicesService: ServicesService,
    @Inject(LLM_PROVIDER) private readonly llm: LlmProvider,
  ) {}

  private get deps(): ToolDeps {
    return {
      prisma: this.prisma,
      workersService: this.workersService,
      servicesService: this.servicesService,
      llm: this.llm,
    };
  }

  async run(
    name: string,
    args: Record<string, any>,
  ): Promise<ToolResult> {
    this.logger.debug(`Executing tool "${name}" with ${JSON.stringify(args)}`);

    try {
      switch (name) {
        case TOOL_NAMES.SEARCH_WORKERS:
          return await searchWorkers(this.deps, args as any);

        case TOOL_NAMES.RECOMMEND_WORKERS:
          return await recommendWorkers(this.deps, args as any);

        case TOOL_NAMES.GET_SERVICE_CATEGORIES:
          return await getServiceCategories(this.deps);

        case TOOL_NAMES.GET_WORKER_DETAIL:
          return await getWorkerDetail(this.deps, args as any);

        case TOOL_NAMES.INITIATE_BOOKING:
          return await initiateBooking(this.deps, args as any);

        case TOOL_NAMES.GET_PLATFORM_INFO:
          return await getPlatformInfo(this.deps, args as any);

        default:
          this.logger.warn(`Unknown tool requested: ${name}`);
          return { data: { error: `Unknown tool: ${name}` } };
      }
    } catch (err: any) {
      this.logger.error(`Tool "${name}" threw: ${err?.message}`);
      return {
        data: { error: `Tool ${name} failed. Please try a different request.` },
      };
    }
  }
}
