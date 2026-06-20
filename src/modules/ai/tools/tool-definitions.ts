import { ToolDefinition } from '../providers/llm-provider.interface';

/**
 * Tool catalogue advertised to the LLM on every agent turn.
 *
 * These are JSON-Schema descriptions ONLY — the model uses them to decide what
 * to call and with which arguments. The real implementations live in
 * tools/*.tool.ts and are dispatched by tool-executor.ts. Keep names in sync
 * with TOOL_NAMES below and with the executor's switch.
 */

export const TOOL_NAMES = {
  SEARCH_WORKERS: 'search_workers',
  RECOMMEND_WORKERS: 'recommend_workers',
  GET_SERVICE_CATEGORIES: 'get_service_categories',
  GET_WORKER_DETAIL: 'get_worker_detail',
  INITIATE_BOOKING: 'initiate_booking',
  GET_PLATFORM_INFO: 'get_platform_info',
} as const;

/** The 8 fixed service categories — surfaced in descriptions to guide the model. */
const SERVICE_LIST =
  'Electrician, Plumber, Carpenter, Painter, AC Technician, Mason, Mechanic, Home Cleaner';

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: TOOL_NAMES.SEARCH_WORKERS,
      description:
        'Search for verified workers by service type, city and budget. ' +
        'Use whenever the customer wants to find, search, show or list workers. ' +
        'Returns up to 5 real workers ranked by quality score.',
      parameters: {
        type: 'object',
        properties: {
          service: {
            type: 'string',
            description: `The service category. One of: ${SERVICE_LIST}.`,
          },
          city: {
            type: 'string',
            description: 'City in Pakistan, e.g. Lahore, Karachi, Islamabad.',
          },
          maxBudget: {
            type: 'number',
            description: 'Maximum visiting charge in PKR. Optional.',
          },
          minRating: {
            type: 'number',
            description: 'Minimum star rating, 1 to 5. Optional.',
          },
        },
        required: ['service'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: TOOL_NAMES.RECOMMEND_WORKERS,
      description:
        'Return the BEST worker recommendations with a short human reason for ' +
        "each. Use when the customer asks for the 'best', 'top' or " +
        "'recommended' worker. Requires both service and city.",
      parameters: {
        type: 'object',
        properties: {
          service: {
            type: 'string',
            description: `The service category. One of: ${SERVICE_LIST}.`,
          },
          city: {
            type: 'string',
            description: 'City in Pakistan.',
          },
          budget: {
            type: 'number',
            description: 'Customer budget in PKR. Optional.',
          },
          urgency: {
            type: 'string',
            enum: ['normal', 'urgent'],
            description: 'How urgently the customer needs the worker. Optional.',
          },
        },
        required: ['service', 'city'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: TOOL_NAMES.GET_SERVICE_CATEGORIES,
      description:
        'List the available service categories. Use when the customer is ' +
        "unsure which category fits their problem (e.g. 'fix my geyser', " +
        "'my fan is broken').",
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: TOOL_NAMES.GET_WORKER_DETAIL,
      description:
        'Get the full profile of one specific worker (bio, rating, jobs ' +
        'completed, services, portfolio). Use when the customer asks for more ' +
        'detail about a worker that was already shown in the conversation.',
      parameters: {
        type: 'object',
        properties: {
          workerId: {
            type: 'string',
            description: 'The workerId returned by a previous search.',
          },
        },
        required: ['workerId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: TOOL_NAMES.GET_PLATFORM_INFO,
      description:
        'Explain how Mehnati works and list its features. Use when the user ' +
        "asks how the platform works, what they can do, what features exist, " +
        'or specifically what a customer or worker can do.',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            enum: ['customer', 'worker', 'general', 'all'],
            description:
              "Which audience to describe. Default 'customer'. Use 'worker' " +
              "for worker-side features, 'general' for an overview, 'all' for " +
              'everything.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: TOOL_NAMES.INITIATE_BOOKING,
      description:
        'Prepare a pre-filled booking for a specific worker and service. Use ' +
        'when the customer clearly says they want to book a particular worker. ' +
        'This does NOT create the booking — it returns a link to the booking form.',
      parameters: {
        type: 'object',
        properties: {
          workerId: {
            type: 'string',
            description: 'The workerId to book.',
          },
          serviceId: {
            type: 'number',
            description: 'The numeric service id for the booking.',
          },
        },
        required: ['workerId', 'serviceId'],
      },
    },
  },
];
