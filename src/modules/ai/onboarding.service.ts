import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ServicesService } from '../services/services.service';
import {
  LLM_PROVIDER,
  LlmProvider,
  ChatMessage,
  ToolDefinition,
} from './providers/llm-provider.interface';
import { WORKER_ONBOARDING_PROMPT } from './prompts/onboarding-prompt';
import { OnboardRequestDto, OnboardingProfileDto } from './dto/onboard-request.dto';
import { OnboardResponseDto } from './dto/onboard-response.dto';
import { findCandidateWorkers } from './tools/search-workers.tool';
import { getPlatformInfo } from './tools/get-platform-info.tool';
import { ToolDeps } from './tools/tool-types';

/** Required chat-collected fields → friendly label for the "still missing" list. */
const REQUIRED_FIELDS: { key: keyof OnboardingProfileDto; label: string }[] = [
  { key: 'fullName', label: 'your full name' },
  { key: 'services', label: 'the work you do and a price for each' },
  { key: 'experienceYears', label: 'your years of experience' },
  { key: 'visitingCharges', label: 'your visiting charge' },
  { key: 'city', label: 'your city' },
  { key: 'bio', label: 'a short bio (just tell me about your work)' },
];

/**
 * Conversational worker onboarding ("Nova onboarding mode").
 *
 * Mirrors the customer AiService agent loop, but its tools mutate a running
 * worker PROFILE instead of fetching workers. The worker chats (often in
 * Roman-Urdu), Nova asks one thing at a time, saves each detail via
 * record_worker_details, and returns the merged profile so the client can
 * pre-fill the signup form. Password/CNIC/photos stay in the normal form.
 */
@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);
  private readonly maxRounds = Number(process.env.AI_MAX_TOOL_ROUNDS ?? 4);

  constructor(
    @Inject(LLM_PROVIDER) private readonly llm: LlmProvider,
    private readonly prisma: PrismaService,
    private readonly servicesService: ServicesService,
  ) {}

  async runOnboarding(dto: OnboardRequestDto): Promise<OnboardResponseDto> {
    const profile: OnboardingProfileDto = { ...(dto.profile ?? {}) };

    const messages: ChatMessage[] = [
      { role: 'system', content: WORKER_ONBOARDING_PROMPT },
      { role: 'system', content: this.profileContext(profile) },
      ...(dto.history ?? []).slice(-12).map((t) => ({
        role: t.role,
        content: t.content,
      })),
      { role: 'user', content: dto.message },
    ];

    let reply = '';

    for (let round = 0; round < this.maxRounds; round++) {
      const result = await this.llm.chat({ messages, tools: TOOL_DEFS });

      if (!result.toolCalls?.length) {
        reply = result.content ?? '';
        break;
      }

      messages.push(result.assistantMessage);
      for (const call of result.toolCalls) {
        const data = await this.dispatch(call.name, call.arguments ?? {}, profile);
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          name: call.name,
          content: JSON.stringify(data),
        });
      }
    }

    if (!reply) {
      // Hit the round cap mid-tool-loop — ask once more, no tools, for clean text.
      const final = await this.llm.chat({ messages, tools: [] });
      reply = final.content ?? 'Theek hai, batayein — aap kya kaam karte hain?';
    }

    const missing = this.missingFields(profile);
    return { reply, profile, missing, complete: missing.length === 0 };
  }

  // ─── Tool dispatch (stateful: mutates `profile`) ───────────────────────────

  private async dispatch(
    name: string,
    args: Record<string, any>,
    profile: OnboardingProfileDto,
  ): Promise<Record<string, any>> {
    this.logger.debug(`onboarding tool "${name}" ${JSON.stringify(args)}`);
    try {
      switch (name) {
        case 'list_services':
          return await this.listServices();
        case 'record_worker_details':
          return await this.recordDetails(args, profile);
        case 'suggest_price':
          return await this.suggestPrice(args as any);
        case 'get_platform_info':
          return (await getPlatformInfo(this.deps, args as any)).data;
        default:
          return { error: `Unknown tool: ${name}` };
      }
    } catch (err: any) {
      this.logger.error(`onboarding tool "${name}" failed: ${err?.message}`);
      return { error: `Tool ${name} failed. Continue without it.` };
    }
  }

  /** All active services, so the model can map a spoken trade to a real one. */
  private async listServices(): Promise<Record<string, any>> {
    const services = await this.servicesService.getActiveServices();
    const byCategory = new Map<string, string[]>();
    for (const s of services) {
      const cat = s.categoryName ?? s.name;
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(s.name);
    }
    return {
      categories: Array.from(byCategory.entries()).map(([category, items]) => ({
        category,
        services: items,
      })),
    };
  }

  /** Merge extracted details into the profile (resolving service names → ids). */
  private async recordDetails(
    args: {
      fullName?: string;
      services?: { name: string; price?: number }[];
      experienceYears?: number;
      visitingCharges?: number;
      homeAddress?: string;
      city?: string;
      bio?: string;
    },
    profile: OnboardingProfileDto,
  ): Promise<Record<string, any>> {
    if (args.fullName) profile.fullName = args.fullName.trim();
    if (typeof args.experienceYears === 'number')
      profile.experienceYears = args.experienceYears;
    if (typeof args.visitingCharges === 'number')
      profile.visitingCharges = args.visitingCharges;
    if (args.homeAddress) profile.homeAddress = args.homeAddress.trim();
    if (args.city) profile.city = args.city.trim();
    if (args.bio) profile.bio = args.bio.trim();

    const unmatched: string[] = [];
    if (args.services?.length) {
      const catalogue = await this.servicesService.getActiveServices();
      profile.services = profile.services ?? [];
      for (const incoming of args.services) {
        const match = resolveService(catalogue, incoming.name);
        if (!match) {
          unmatched.push(incoming.name);
          continue;
        }
        const existing = profile.services.find((s) => s.serviceId === match.id);
        if (existing) {
          if (typeof incoming.price === 'number') existing.price = incoming.price;
        } else {
          profile.services.push({
            serviceId: match.id,
            name: match.name,
            price: incoming.price ?? 0,
          });
        }
      }
    }

    return {
      saved: true,
      profile,
      missing: this.missingFields(profile),
      unmatchedServices: unmatched.length ? unmatched : undefined,
    };
  }

  /** Market price range for a service + city, from real worker data in the DB. */
  private async suggestPrice(args: {
    service: string;
    city?: string;
  }): Promise<Record<string, any>> {
    const candidates = await findCandidateWorkers(this.prisma, {
      service: args.service,
      city: args.city,
      limit: 25,
    });

    const visiting = candidates.map((w) => w.visitingCharges).filter((n) => n > 0);
    const servicePrices = candidates
      .flatMap((w) => w.services)
      .filter((s) => s.name.toLowerCase().includes(args.service.toLowerCase()))
      .map((s) => s.price)
      .filter((n) => n > 0);

    if (!visiting.length && !servicePrices.length) {
      return {
        service: args.service,
        city: args.city,
        note: 'Not enough data yet for this service/city. Suggest a fair price; it can be changed later.',
      };
    }

    return {
      service: args.service,
      city: args.city,
      visitingChargePkr: range(visiting),
      servicePricePkr: range(servicePrices),
      note: 'Use this range to guide the worker; the final price is theirs to set.',
    };
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private missingFields(profile: OnboardingProfileDto): string[] {
    return REQUIRED_FIELDS.filter(({ key }) => {
      const v = profile[key];
      if (key === 'services') {
        const list = v as OnboardingProfileDto['services'];
        return !list?.length || list.some((s) => s.price <= 0);
      }
      if (key === 'experienceYears') return typeof v !== 'number';
      if (key === 'visitingCharges') return typeof v !== 'number' || (v as number) <= 0;
      return !v;
    }).map(({ label }) => label);
  }

  /** A short system note so the model knows what's already collected. */
  private profileContext(profile: OnboardingProfileDto): string {
    const missing = this.missingFields(profile);
    return (
      `Current collected profile (do NOT re-ask what is already filled):\n` +
      `${JSON.stringify(profile)}\n` +
      (missing.length
        ? `Still needed: ${missing.join(', ')}. Ask for the next missing one.`
        : `Everything is collected. Summarise the profile and tell them the last step is photos + password.`)
    );
  }

  /** ToolDeps for the reused get_platform_info (only needs prisma). */
  private get deps(): ToolDeps {
    return {
      prisma: this.prisma,
      servicesService: this.servicesService,
      workersService: undefined as any, // get_platform_info doesn't use it
      llm: this.llm,
    };
  }
}

// ─── Pure helpers ──────────────────────────────────────────────────────────

function resolveService(
  catalogue: { id: number; name: string; categoryName: string }[],
  input: string,
): { id: number; name: string } | null {
  const q = input.trim().toLowerCase();
  if (!q) return null;
  const exact = catalogue.find((s) => s.name.toLowerCase() === q);
  if (exact) return { id: exact.id, name: exact.name };
  const cat = catalogue.find((s) => s.categoryName.toLowerCase() === q);
  if (cat) return { id: cat.id, name: cat.name };
  const partial = catalogue.find(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.categoryName.toLowerCase().includes(q) ||
      q.includes(s.categoryName.toLowerCase()),
  );
  return partial ? { id: partial.id, name: partial.name } : null;
}

function range(values: number[]): { min: number; avg: number; max: number } | null {
  if (!values.length) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    min: Math.min(...values),
    avg: Math.round(sum / values.length),
    max: Math.max(...values),
  };
}

// ─── Tool catalogue advertised to the LLM each onboarding turn ───────────────

const TOOL_DEFS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'list_services',
      description:
        'List the Mehnati service categories. Call this when the worker tells ' +
        'you their trade, so you map it to a real service before saving.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'record_worker_details',
      description:
        'Save any details you have learned about the worker so far. Call this ' +
        'every time you learn something new (name, a service + price, ' +
        'experience, visiting charge, city, or the bio you wrote for them).',
      parameters: {
        type: 'object',
        properties: {
          fullName: { type: 'string', description: "The worker's full name." },
          services: {
            type: 'array',
            description: 'Services the worker offers, with the price they set.',
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'A Mehnati service or category name.',
                },
                price: {
                  type: 'number',
                  description: 'Price for this service in PKR.',
                },
              },
              required: ['name'],
            },
          },
          experienceYears: {
            type: 'number',
            description: 'Years of experience.',
          },
          visitingCharges: {
            type: 'number',
            description: 'Fixed visiting/call-out charge in PKR.',
          },
          homeAddress: { type: 'string', description: 'Area / street address.' },
          city: { type: 'string', description: 'City in Pakistan.' },
          bio: {
            type: 'string',
            description:
              'A short professional bio YOU wrote from what the worker told you.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'suggest_price',
      description:
        'Get a fair market price range (visiting charge + service price) for a ' +
        'service in a city, from real worker data. Use it before asking the ' +
        'worker to set a price, and tell them the range.',
      parameters: {
        type: 'object',
        properties: {
          service: { type: 'string', description: 'The service or trade.' },
          city: { type: 'string', description: 'City in Pakistan. Optional.' },
        },
        required: ['service'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_platform_info',
      description:
        'Explain how Mehnati works for workers: getting jobs, commission, ' +
        'rewards/tiers, payments, verification. Use when the worker asks.',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            enum: ['worker', 'rewards', 'policies', 'account', 'general'],
            description: "Default 'worker'.",
          },
        },
      },
    },
  },
];
