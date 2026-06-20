# AI Integration — Backend Implementation Guide

> **Module:** Mehnati Marketplace — Agentic AI + Chatbot
> **Stack:** NestJS + Prisma + Groq (cloud) / Ollama (local)
> **Scope:** This document covers the **backend** only. See `AI_INTEGRATION_FRONTEND.md` in the frontend folder for the UI side.

---

## 1. What We Are Building

We are NOT building a simple "answer-from-memory" chatbot. We are building **Agentic AI with Tool Use** — an AI that can call our real database, search, filter, rank, and recommend actual workers.

| Simple Chatbot | Agentic AI (what we build) |
|---|---|
| Answers from training knowledge | Calls our actual Prisma database |
| "There are plumbers in Lahore" (guessed) | Returns Ahmed, Ali, Hassan with real ratings |
| Can only talk | Can search, filter, rank, recommend, pre-fill bookings |
| Stateless | Remembers conversation context |

### Two AI capabilities delivered by this backend

1. **Agentic Worker Search & Recommendation** — Customer describes a need in natural language (English/Urdu), AI calls DB tools, returns ranked real workers.
2. **Conversational Chatbot** — Platform Q&A, booking help, complaint guidance, with the *same* agent able to switch into tool-use when needed.

Plus optional extensions:
3. **Worker Conversational Onboarding** — chat-based signup that fills `CreateWorkerDto`.
4. **Admin AI Automation** — daily briefing, complaint auto-classification, suspicious-account flagging.

---

## 2. Core Concept — How Tool Use Works

Groq (and Ollama) support **function calling**. We define a set of tools the AI is allowed to call. The AI decides *when* to call them.

```
Customer: "I need a plumber in Lahore, under 2000 budget"
                    │
                    ▼
Backend → Groq:  [message] + [tool definitions: search_workers, recommend_workers, ...]
                    │
                    ▼
Groq decides: "I must call search_workers"
Groq returns: TOOL_CALL search_workers({ service:"Plumber", city:"Lahore", maxBudget:2000 })
                    │
                    ▼
Backend executes the REAL Prisma query (reuses existing WorkersService logic)
Returns: [Ahmed(4.8★,1800), Ali(4.5★,1500), Hassan(4.2★,2000)]
                    │
                    ▼
Backend → Groq:  [tool result]
                    │
                    ▼
Groq writes final answer:
"I found 3 plumbers in Lahore within budget: 1. Ahmed 4.8★ ..."
                    │
                    ▼
Backend → Frontend: { reply, toolUsed, workers[], action }
```

The key insight: **the AI never invents worker data. It only formats real DB results.**

---

## 3. Module Structure

New module: `src/modules/ai/`

```
src/modules/ai/
├── ai.module.ts                 # NestJS module (imports PrismaModule, WorkersModule, ServicesModule)
├── ai.controller.ts             # HTTP endpoints
├── ai.service.ts                # Orchestrator: Groq loop + tool dispatch
├── providers/
│   ├── groq.provider.ts         # Groq API client (chat completions + tool calling)
│   └── ollama.provider.ts       # Local Ollama client (fallback / privacy tasks)
├── tools/
│   ├── tool-definitions.ts      # JSON schema of all tools (sent to the LLM)
│   ├── tool-executor.ts         # Maps tool name → real implementation
│   ├── search-workers.tool.ts   # DB query for worker search
│   ├── recommend-workers.tool.ts# Ranking + AI explanation
│   ├── get-categories.tool.ts   # Service categories
│   └── get-worker-detail.tool.ts# Single worker full profile
├── prompts/
│   ├── system-prompt.ts         # Customer agent persona + platform facts
│   └── onboarding-prompt.ts     # Worker onboarding persona
└── dto/
    ├── agent-request.dto.ts     # { message, history[], userId? }
    ├── agent-response.dto.ts     # { reply, toolUsed?, workers?, action? }
    └── onboard-chat.dto.ts       # worker onboarding turn
```

Register `AiModule` in `src/app.module.ts` under the "Feature modules" group.

---

## 4. Environment Variables

Add to backend `.env`:

```env
# ===== AI Configuration =====
AI_PROVIDER=groq                 # groq | ollama
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
GROQ_MODEL=llama-3.3-70b-versatile   # supports tool calling, good Urdu
GROQ_BASE_URL=https://api.groq.com/openai/v1

# Local fallback
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1            # must support tools; e.g. llama3.1 / qwen2.5

AI_MAX_TOOL_ROUNDS=3             # safety cap on agent loop iterations
AI_REQUEST_TIMEOUT_MS=30000
```

> **Model note:** Groq's `llama-3.3-70b-versatile` is the recommended default — it supports tool calling and handles Urdu/Roman-Urdu well. For pure JSON extraction tasks (onboarding), `llama-3.1-8b-instant` is faster and cheaper.

---

## 5. Dependencies

```bash
cd FYP_BACKEND
npm install groq-sdk
# Ollama uses plain fetch — no SDK required, but optional:
# npm install ollama
```

Both Groq SDK and Ollama expose an **OpenAI-compatible** chat completions API, so the same tool-calling message shape works for both.

---

## 6. The Tools (Function Definitions)

These JSON schemas are sent to the LLM so it knows what it can call. Live in `tools/tool-definitions.ts`.

### Tool 1 — `search_workers`
```jsonc
{
  "type": "function",
  "function": {
    "name": "search_workers",
    "description": "Search workers by service type, city and budget. Use whenever the customer wants to find, search, show or list workers.",
    "parameters": {
      "type": "object",
      "properties": {
        "service":   { "type": "string", "description": "e.g. Plumber, Electrician, Carpenter, Painter, AC Technician, Mason, Mechanic, Home Cleaner" },
        "city":      { "type": "string", "description": "City in Pakistan, e.g. Lahore, Karachi" },
        "maxBudget": { "type": "number", "description": "Max visiting charge in PKR (optional)" },
        "minRating": { "type": "number", "description": "Minimum star rating 1-5 (optional)" }
      },
      "required": ["service"]
    }
  }
}
```
**Implementation (`search-workers.tool.ts`):** reuses `WorkersService.getVerifiedWorkers` logic. Maps the service NAME → `serviceId` via `ServicesService`, filters `visitingCharges <= maxBudget` and `averageRating >= minRating`, sorts by existing `rankingScore`, returns top 5.

### Tool 2 — `recommend_workers`
```jsonc
{
  "type": "function",
  "function": {
    "name": "recommend_workers",
    "description": "Return the AI-ranked BEST worker recommendations with a human reason for each. Use when the customer wants 'the best' or 'recommended' option.",
    "parameters": {
      "type": "object",
      "properties": {
        "service": { "type": "string" },
        "city":    { "type": "string" },
        "budget":  { "type": "number" },
        "urgency": { "type": "string", "enum": ["normal", "urgent"] }
      },
      "required": ["service", "city"]
    }
  }
}
```
**Implementation:** This is the **recommendation engine** (see §8). Fetches matching verified workers, scores them with the weighted formula already in `WorkersService.calculateRankingScore`, asks the LLM to write a one-line reason per worker, returns ranked list.

### Tool 3 — `get_service_categories`
```jsonc
{
  "type": "function",
  "function": {
    "name": "get_service_categories",
    "description": "List the available service categories. Use when the customer is unsure which category fits their problem (e.g. 'fix my geyser').",
    "parameters": { "type": "object", "properties": {} }
  }
}
```
**Implementation:** returns the 8 categories from `ServicesService` (Electrician, Plumber, Carpenter, Painter, AC Technician, Mason, Mechanic, Home Cleaner) with English + Urdu names.

### Tool 4 — `get_worker_detail`
```jsonc
{
  "type": "function",
  "function": {
    "name": "get_worker_detail",
    "description": "Get the full profile of one specific worker (bio, rating, jobs completed, portfolio). Use when the customer asks for more detail about a named/listed worker.",
    "parameters": {
      "type": "object",
      "properties": { "workerId": { "type": "string" } },
      "required": ["workerId"]
    }
  }
}
```
**Implementation:** calls existing `WorkersService.getWorkerById`.

### Tool 5 — `initiate_booking` (optional, advanced)
```jsonc
{
  "type": "function",
  "function": {
    "name": "initiate_booking",
    "description": "Prepare a pre-filled booking for a worker+service. Use when the customer says they want to book a specific worker.",
    "parameters": {
      "type": "object",
      "properties": {
        "workerId":  { "type": "string" },
        "serviceId": { "type": "number" }
      },
      "required": ["workerId", "serviceId"]
    }
  }
}
```
**Implementation:** does NOT create the booking server-side. Returns an `action` deep-link string `redirect:/customer/book/{serviceId}?workerId={workerId}` that the frontend uses to navigate to the existing booking form.

---

## 7. The Agent Loop (ai.service.ts)

This is the heart of the backend. Pseudocode:

```ts
async runAgent(message, history, userId): Promise<AgentResponseDto> {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,                       // last ~10 turns
    { role: 'user', content: message }
  ];

  let collectedWorkers = [];
  let action = null;

  for (let round = 0; round < AI_MAX_TOOL_ROUNDS; round++) {
    // 1. Ask the LLM
    const res = await provider.chat({ messages, tools: TOOL_DEFINITIONS });

    // 2. No tool call → final answer
    if (!res.tool_calls) {
      return { reply: res.content, workers: collectedWorkers, action };
    }

    // 3. Execute every tool the model asked for
    messages.push(res.assistantMessage);             // record the tool request
    for (const call of res.tool_calls) {
      const result = await toolExecutor.run(call.name, call.arguments, userId);

      if (call.name === 'search_workers' || call.name === 'recommend_workers')
        collectedWorkers = result.workers;            // surface to frontend
      if (call.name === 'initiate_booking')
        action = result.action;

      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(result)
      });
    }
    // loop again so the LLM can read tool results and respond
  }

  // Safety: hit max rounds → ask LLM for a final text answer with no tools
  const final = await provider.chat({ messages, tools: [] });
  return { reply: final.content, workers: collectedWorkers, action };
}
```

**Why the loop:** the model may need to call a tool, read its result, then either answer OR call another tool (e.g. `get_service_categories` → then `search_workers`). `AI_MAX_TOOL_ROUNDS` prevents infinite loops.

---

## 8. The Recommendation Engine (recommend-workers.tool.ts)

Step-by-step for `recommend_workers({ service:"Plumber", city:"Lahore", budget:2000 })`:

```
Step 1 — Fetch candidates from DB (Prisma):
  workerProfile WHERE verificationStatus = APPROVED
    AND services.some.service.name = "Plumber"
    AND homeAddress CONTAINS "Lahore"           (or city field)
    AND visitingCharges <= 2000

Step 2 — Score each (reuse calculateRankingScore from WorkersService):
  score = 0.4*ratingScore + 0.3*jobsScore + 0.2*responseScore + 0.1*repeatScore
  Ahmed  → 0.654
  Ali    → 0.570
  Hassan → 0.486

Step 3 — Sort desc, take top 3-5.

Step 4 — LLM writes a one-line reason per worker (single batched call):
  "Ahmed (4.8★) — Highest-rated plumber in your area, 23 jobs done,
   PKR 1800 — within your PKR 2000 budget."

Step 5 — Return:
  { workers: [{ ...workerDto, reason }], summary: "I recommend Ahmed because ..." }
```

> The ranking math is deterministic (DB + formula). The LLM only adds the *explanation* text. This keeps recommendations trustworthy and demoable.

---

## 9. System Prompt (prompts/system-prompt.ts)

```
You are "Mehnati Assistant", the AI helper for Mehnati — a marketplace
connecting customers with verified skilled workers across Pakistan.

LANGUAGE: Reply in the language the customer uses. Understand English,
Urdu and Roman-Urdu. Keep replies short and friendly.

YOU CAN: find workers, recommend the best worker, explain services and
pricing, help with bookings and complaints, track booking status.

TOOLS: When the customer wants to find/search/recommend a worker, you MUST
call the relevant tool to get REAL data. Never invent worker names,
ratings or prices. If a required detail (service or city) is missing,
ask one short follow-up question first.

PLATFORM FACTS:
- 8 categories: Electrician, Plumber, Carpenter, Painter, AC Technician,
  Mason, Mechanic, Home Cleaner.
- Workers are CNIC-verified before appearing.
- Booking flow: PENDING → NEGOTIATION → ACCEPTED → IN_PROGRESS → COMPLETED.
- Prices are negotiated with the worker before confirmation.
- Currency is PKR.

STYLE: Be concise. Use the customer's budget and city. After showing
workers, offer to show more detail or start a booking.
```

---

## 10. API Endpoints (ai.controller.ts)

| Method | Route | Auth | Body | Purpose |
|---|---|---|---|---|
| POST | `/ai/agent` | optional JWT | `{ message, history[], userId? }` | Main agentic chat + search + recommend |
| POST | `/ai/onboard` | none | `{ history[], message }` | Worker conversational onboarding turn |
| POST | `/ai/admin/briefing` | JWT (ADMIN) | `{}` | Generate daily admin summary |
| POST | `/ai/admin/classify-complaint` | JWT (ADMIN) | `{ complaintId }` | Auto-label a complaint |

### `POST /ai/agent` — request
```json
{
  "message": "mujhe Lahore mein electrician chahiye 2500 budget",
  "history": [
    { "role": "user", "content": "hi" },
    { "role": "assistant", "content": "Assalam o Alaikum! How can I help?" }
  ],
  "userId": "optional-customer-id"
}
```

### `POST /ai/agent` — response
```json
{
  "reply": "I found 3 verified electricians in Lahore within PKR 2500:",
  "toolUsed": "search_workers",
  "workers": [
    {
      "workerId": "abc",
      "fullName": "Ahmed Ali",
      "averageRating": 4.8,
      "totalJobsCompleted": 23,
      "visitingCharges": 1800,
      "services": [{ "id": 1, "name": "Electrician" }],
      "reason": "Highest rated, well within budget"
    }
  ],
  "action": null
}
```

Responses are wrapped by the existing global `TransformInterceptor` (`{ success, data, ... }`).

---

## 11. Provider Abstraction (Groq ↔ Ollama)

Both providers implement one interface so the agent loop is provider-agnostic:

```ts
export interface LlmProvider {
  chat(args: {
    messages: ChatMessage[];
    tools?: ToolDefinition[];
    temperature?: number;
  }): Promise<{
    content: string | null;
    tool_calls?: { id: string; name: string; arguments: any }[];
    assistantMessage: ChatMessage;     // raw assistant msg to push back
  }>;
}
```

- `GroqProvider` → POST `${GROQ_BASE_URL}/chat/completions` with `Authorization: Bearer ${GROQ_API_KEY}`.
- `OllamaProvider` → POST `${OLLAMA_BASE_URL}/v1/chat/completions` (OpenAI-compatible endpoint).

Select via `AI_PROVIDER` env. Default Groq; fall back to Ollama if Groq fails or for privacy-sensitive tasks (e.g. CNIC text). Wire this in `ai.module.ts` with a factory provider.

---

## 12. Worker Conversational Onboarding (Optional Phase)

`POST /ai/onboard` runs a stateful extraction conversation. After each user turn, the LLM returns BOTH a reply and a partial JSON of collected fields:

```
Collected so far → { fullName, services[], city, visitingCharges, experienceYears, phoneNumber, ... }
```

When all required `CreateWorkerDto` fields are present, the response includes
`{ complete: true, draft: CreateWorkerDto }`. The frontend shows a summary and
posts the draft to the EXISTING `POST /workers/register` — no new registration
logic needed. CNIC images / selfie still go through the normal upload flow.

Uses `prompts/onboarding-prompt.ts`. Recommended model: `llama-3.1-8b-instant`
(structured extraction, cheap, fast).

---

## 13. Admin AI Automation (Optional Phase)

| Feature | How it works |
|---|---|
| **Daily briefing** | Query counts (new bookings, pending complaints, verifications, revenue) → feed JSON to LLM → returns 2-3 sentence plain-English summary. |
| **Complaint classifier** | Send complaint text → LLM returns one of `billing_dispute / quality_issue / worker_behavior / fraud_suspected` → store label, route to admin queue. |
| **Suspicious flagging** | Rule pre-filter (0 jobs + ≥N complaints, sudden bad reviews) → LLM explains why flagged → surface in admin panel. |

All read from existing tables (`Booking`, `Complaint`, `WorkerProfile`, `Feedback`). No schema changes required.

---

## 14. Security & Cost Controls

- **Rate limit** `/ai/agent` (e.g. `@nestjs/throttler`, 20 req/min/IP) — prevents API-key abuse.
- **Never expose `GROQ_API_KEY` to the frontend.** All LLM calls go through this backend.
- **Cap history** to last 10 turns before sending to the LLM (token cost).
- **`AI_MAX_TOOL_ROUNDS`** guards against tool loops.
- **Validate tool arguments** with class-validator before executing DB queries.
- **Sanitize tool output** — only return public worker fields (no phone/CNIC) unless the customer is authenticated and booking.

---

## 15. Build Order (Backend)

1. `npm install groq-sdk`; add `.env` vars.
2. `providers/groq.provider.ts` + `LlmProvider` interface (+ optional Ollama).
3. `tools/tool-definitions.ts` (the JSON schemas).
4. `tools/*.tool.ts` implementations reusing `WorkersService` / `ServicesService`.
5. `tools/tool-executor.ts` (name → impl dispatch).
6. `prompts/system-prompt.ts`.
7. `ai.service.ts` (the agent loop).
8. `ai.controller.ts` (`POST /ai/agent`).
9. `ai.module.ts`; register in `app.module.ts`.
10. Test with curl, then wire the frontend (see frontend MD).
11. (Optional) onboarding, then admin automation.

### Quick test
```bash
curl -X POST http://localhost:4000/ai/agent \
  -H "Content-Type: application/json" \
  -d '{"message":"find me a plumber in Lahore under 2000","history":[]}'
```

---

## 16. Reused Existing Code (No Duplication)

| AI need | Existing code reused |
|---|---|
| Worker search/filter | `WorkersService.getVerifiedWorkers`, `getAllWorkers` |
| Ranking | `WorkersService.calculateRankingScore` (rating 40 / jobs 30 / response 20 / repeat 10) |
| Worker detail | `WorkersService.getWorkerById` |
| Service categories | `ServicesService` |
| Worker registration | `POST /workers/register` (`CreateWorkerDto`) |
| Complaints / bookings data | `ComplaintsService`, `BookingsService` |
| Response shape | global `TransformInterceptor` |

The AI module is an **orchestration layer** on top of services you already have.
