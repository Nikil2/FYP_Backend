import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { uploadToCloudinary } from '../../common/utils/cloudinary.util';
import { ServicesService } from '../services/services.service';
import {
  LLM_PROVIDER,
  LlmProvider,
  ChatMessage,
  ToolDefinition,
} from './providers/llm-provider.interface';
import { WORKER_ONBOARDING_PROMPT } from './prompts/onboarding-prompt';
import {
  OnboardRequestDto,
  OnboardingProfileDto,
} from './dto/onboard-request.dto';
import {
  OnboardResponseDto,
  OnboardingAwaiting,
} from './dto/onboard-response.dto';
import { findCandidateWorkers } from './tools/search-workers.tool';
import { getPlatformInfo } from './tools/get-platform-info.tool';
import { ToolDeps } from './tools/tool-types';

/**
 * The ordered onboarding checklist. Each step is either a TEXT step (Nova asks
 * and the LLM saves it) or a CAPTURE step (`capture` set — the client renders an
 * inline widget: current-location or camera). `done` decides if the step is
 * satisfied from the profile gathered so far; `ask` is the Roman-Urdu prompt
 * used by the deterministic fallback when the LLM is unavailable.
 *
 * Order matters: `awaiting`/`missing` walk this list top-to-bottom, so the first
 * unfinished step drives what happens next.
 */
type OnboardingStep = {
  label: string;
  ask: string;
  capture?: OnboardingAwaiting; // undefined => plain text step
  done: (p: OnboardingProfileDto) => boolean;
};

const STEPS: OnboardingStep[] = [
  {
    label: 'your full name',
    ask: 'Aap ka poora naam kya hai?',
    done: (p) => !!p.fullName,
  },
  {
    label: 'the work you do and a price for each',
    ask: 'Aap kaun kaun se kaam karte hain, aur har kaam ki price (PKR) kya hai?',
    done: (p) => !!p.services?.length && p.services.every((s) => s.price > 0),
  },
  {
    label: 'your years of experience',
    ask: 'Aap ko kitne saal ka tajurba hai?',
    done: (p) => typeof p.experienceYears === 'number',
  },
  {
    label: 'your visiting charge',
    ask: 'Aap ki visiting charge (site pe aane ki fixed fees) kitni hai?',
    done: (p) => typeof p.visitingCharges === 'number' && p.visitingCharges > 0,
  },
  {
    label: 'your work location',
    ask: 'Ab apni location share karein — neeche jo button aaye ga use dabayein.',
    capture: 'location',
    done: (p) =>
      typeof p.homeLat === 'number' &&
      typeof p.homeLng === 'number' &&
      !!p.homeAddress,
  },
  {
    label: 'your CNIC number and its front & back photos',
    ask: 'Apna CNIC number aur CNIC ki dono taraf ki tasveerein — button se lagayein.',
    capture: 'cnic',
    done: (p) => !!p.cnicNumber && !!p.cnicFrontUrl && !!p.cnicBackUrl,
  },
  {
    label: 'a selfie',
    ask: 'Ek selfie le lein — camera button dabayein.',
    capture: 'selfie',
    done: (p) => !!p.selfieUrl,
  },
  {
    label: 'a few photos of your work',
    ask: 'Apne kaam ki 1-2 tasveerein lagayein — button se.',
    capture: 'workPhotos',
    done: (p) => !!p.workPhotosUrls?.length,
  },
  {
    label: 'a short bio (just tell me about your work)',
    ask: 'Thoda apne kaam ke baare mein batayein — main aap ke liye bio likh dunga.',
    done: (p) => !!p.bio,
  },
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
  private readonly maxRounds = Number(process.env.AI_MAX_TOOL_ROUNDS ?? 6);

  constructor(
    @Inject(LLM_PROVIDER) private readonly llm: LlmProvider,
    private readonly prisma: PrismaService,
    private readonly servicesService: ServicesService,
  ) {}

  async runOnboarding(dto: OnboardRequestDto): Promise<OnboardResponseDto> {
    const profile: OnboardingProfileDto = { ...(dto.profile ?? {}) };

    const messages: ChatMessage[] = [
      { role: 'system', content: WORKER_ONBOARDING_PROMPT },
      { role: 'system', content: await this.categoriesContext() },
      { role: 'system', content: this.profileContext(profile) },
      ...(dto.history ?? []).slice(-12).map((t) => ({
        role: t.role,
        content: t.content,
      })),
      { role: 'user', content: dto.message },
    ];

    let reply = '';

    // Any LLM failure here must NOT discard the profile we've already merged —
    // otherwise the client keeps its stale profile and Nova re-asks everything.
    try {
      for (let round = 0; round < this.maxRounds; round++) {
        const result = await this.llm.chat({ messages, tools: TOOL_DEFS });

        if (!result.toolCalls?.length) {
          reply = result.content ?? '';
          break;
        }

        messages.push(result.assistantMessage);
        for (const call of result.toolCalls) {
          const data = await this.dispatch(
            call.name,
            call.arguments ?? {},
            profile,
          );
          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            name: call.name,
            content: JSON.stringify(data),
          });
        }
      }

      if (!reply) {
        // Hit the round cap mid-tool-loop — force a clean text reply.
        reply = await this.forceTextReply(messages, profile);
      }
    } catch (err: any) {
      this.logger.error(`onboarding LLM loop failed: ${err?.message}`);
      reply = this.fallbackReply(profile);
    }

    const missing = this.missingFields(profile);
    return {
      reply,
      profile,
      missing,
      awaiting: this.computeAwaiting(profile),
      complete: missing.length === 0,
    };
  }

  /**
   * Coax a plain-text reply out of the model after the tool loop. gpt-oss
   * sometimes still emits a tool call even with tools stripped, which Groq
   * rejects (400 tool_use_failed / "tool choice is none, but model called a
   * tool"). We add an explicit no-tools instruction and, if it still fails,
   * fall back to a deterministic prompt instead of crashing.
   */
  private async forceTextReply(
    messages: ChatMessage[],
    profile: OnboardingProfileDto,
  ): Promise<string> {
    const guarded: ChatMessage[] = [
      ...messages,
      {
        role: 'system',
        content:
          'Do NOT call any tool now. Reply to the worker in plain text only: ' +
          'briefly confirm what you saved, then ask for the next missing detail.',
      },
    ];
    try {
      const final = await this.llm.chat({ messages: guarded, tools: [] });
      if (final.content?.trim()) return final.content.trim();
    } catch (err: any) {
      this.logger.warn(`onboarding forced text reply failed: ${err?.message}`);
    }
    return this.fallbackReply(profile);
  }

  /** Deterministic reply built from profile state — never touches the LLM. */
  private fallbackReply(profile: OnboardingProfileDto): string {
    const missing = this.missingFieldDefs(profile);
    if (!missing.length) {
      return (
        'Bohot khoob! Aap ki saari maloomat mil gayi hai. ✅ ' +
        'Aakhri step: kuch tasveerein (kaam ki, selfie, CNIC) aur ek password — ' +
        'ye camera se jaldi ho jayega.'
      );
    }
    return `Theek hai, shukriya. ${missing[0].ask}`;
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
      // The model varies the shape: services can be objects or bare strings,
      // and it may use singular/alternate keys. Accept them all defensively.
      services?: (
        | string
        | { name?: string; service?: string; price?: number }
      )[];
      experienceYears?: number;
      experience?: number;
      visitingCharges?: number;
      visitingCharge?: number;
      homeAddress?: string;
      city?: string;
      bio?: string;
    },
    profile: OnboardingProfileDto,
  ): Promise<Record<string, any>> {
    if (args.fullName) profile.fullName = args.fullName.trim();

    const experienceYears = args.experienceYears ?? args.experience;
    if (typeof experienceYears === 'number')
      profile.experienceYears = experienceYears;

    const visitingCharges = args.visitingCharges ?? args.visitingCharge;
    if (typeof visitingCharges === 'number')
      profile.visitingCharges = visitingCharges;

    if (args.homeAddress) profile.homeAddress = args.homeAddress.trim();
    if (args.city) profile.city = args.city.trim();
    if (args.bio) profile.bio = args.bio.trim();

    const unmatched: string[] = [];
    const incomingServices = normalizeServices(args.services);
    if (incomingServices.length) {
      const catalogue = await this.servicesService.getActiveServices();
      profile.services = profile.services ?? [];
      for (const incoming of incomingServices) {
        const match = resolveService(catalogue, incoming.name);
        if (!match) {
          unmatched.push(incoming.name);
          continue;
        }
        const existing = profile.services.find((s) => s.serviceId === match.id);
        if (existing) {
          if (typeof incoming.price === 'number')
            existing.price = incoming.price;
        } else {
          profile.services.push({
            serviceId: match.id,
            name: match.name,
            price: incoming.price ?? 0,
          });
        }
      }
    }

    const servicesNeedingPrice = (profile.services ?? [])
      .filter((s) => !(s.price > 0))
      .map((s) => s.name);

    return {
      saved: true,
      profile,
      missing: this.missingFields(profile),
      unmatchedServices: unmatched.length ? unmatched : undefined,
      // Concrete names, not just the generic "missing" label — the model must
      // keep asking prices one by one until this list is empty before moving on.
      servicesNeedingPrice: servicesNeedingPrice.length
        ? servicesNeedingPrice
        : undefined,
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

    const visiting = candidates
      .map((w) => w.visitingCharges)
      .filter((n) => n > 0);
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

  /**
   * Upload one inline onboarding image (CNIC front/back, selfie, work photo) to
   * Cloudinary and return its URL. Called before the WorkerProfile exists, so it
   * just returns a URL the client stores in the profile until completion.
   */
  async uploadImage(
    file: { buffer: Buffer } | undefined,
    userId: string,
  ): Promise<{ url: string }> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('No image received.');
    }
    const result = await uploadToCloudinary(
      { buffer: file.buffer },
      `onboarding/${userId}`,
    );
    return { url: result.secure_url };
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private missingFields(profile: OnboardingProfileDto): string[] {
    return this.missingFieldDefs(profile).map(({ label }) => label);
  }

  /** The checklist steps still unfinished, in order. */
  private missingFieldDefs(profile: OnboardingProfileDto): OnboardingStep[] {
    return STEPS.filter((step) => !step.done(profile));
  }

  /**
   * The inline widget the client should show next. Walks the ordered checklist:
   * if the first unfinished step is a CAPTURE step, return its widget type;
   * otherwise Nova is still gathering typed fields, so return 'text'.
   */
  private computeAwaiting(profile: OnboardingProfileDto): OnboardingAwaiting {
    const next = this.missingFieldDefs(profile)[0];
    return next?.capture ?? 'text';
  }

  /**
   * Live service categories injected each turn so Nova asks the trade question
   * with the REAL, current Mehnati categories (no hardcoded list to drift from
   * the DB). One cheap query; the model still uses list_services to map a
   * spoken trade to a specific service.
   */
  private async categoriesContext(): Promise<string> {
    const services = await this.servicesService.getActiveServices();
    const categories = Array.from(
      new Set(services.map((s) => s.categoryName ?? s.name)),
    );
    if (!categories.length) {
      return 'Mehnati service categories are unavailable right now — ask the worker to describe their trade in their own words.';
    }
    return (
      'These are the ONLY Mehnati service categories available right now. ' +
      'When you ask the worker what work they do, offer these exact options ' +
      '(do not invent or omit any):\n' +
      categories.join(', ')
    );
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

/**
 * The model sends services in wildly varying shapes: an array of objects
 * (`{name, price}`), an array of bare strings (`"Wiring & Rewiring"`), or with a
 * `service` key instead of `name`. Coerce everything into `{name, price?}` so a
 * whole services list is never silently dropped.
 */
function normalizeServices(
  raw:
    | (string | { name?: string; service?: string; price?: number })[]
    | undefined,
): { name: string; price?: number }[] {
  if (!raw?.length) return [];
  const out: { name: string; price?: number }[] = [];
  for (const item of raw) {
    if (typeof item === 'string') {
      const name = item.trim();
      if (name) out.push({ name });
    } else if (item && typeof item === 'object') {
      const name = (item.name ?? item.service ?? '').trim();
      if (name) {
        out.push({
          name,
          price: typeof item.price === 'number' ? item.price : undefined,
        });
      }
    }
  }
  return out;
}

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

function range(
  values: number[],
): { min: number; avg: number; max: number } | null {
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
          homeAddress: {
            type: 'string',
            description: 'Area / street address.',
          },
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
