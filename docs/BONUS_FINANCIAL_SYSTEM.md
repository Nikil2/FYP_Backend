# Mehnati — Bonus, Commission & Wallet System

**Implementation blueprint for the financial / rewards module.**
Tailored to the Pakistani market. Written against the *actual* current codebase
(NestJS + Prisma backend, Next.js frontend).

---

## ✅ Decisions locked

| Decision | Choice | Implication |
|---|---|---|
| Commission collection | **Wallet debit** | Jobs stay cash; platform debits 10% from the worker's wallet on completion. Top-ups via JazzCash/Easypaisa/Raast. |
| Bonus cadence | **Every 20 jobs (rolling)** | Bonus fires the **moment** a worker completes their 20th / 40th / 60th… job — **event-driven inside the completion transaction**, *not* a month-end cron. |
| Demo top-up | **Mock / admin credit** | A simulated top-up (or admin credit). Real gateway = Phase 4. |
| Build now? | **Plan only** | No code yet; this doc is the agreed spec. |

> ⚠️ The rolling-20 choice changes §5 and §10 vs. the original draft: the bonus engine
> is a **trigger**, not a scheduled job. Sections below are updated for this.

---

## 0. Read this first — the honest assessment

The two PDFs (`Mehnati_Bonus_Program.pdf`, `Mehnati_Bonus_System_User_Stories.pdf`)
describe a bonus engine that sits **on top of a money layer that does not exist yet**
in the codebase. Before a single bonus can be paid, that money layer has to be built.

What the PDFs assume exists, vs. what the code actually has today:

| The bonus design needs… | Current reality in the repo |
|---|---|
| `completedJobs` counter per worker | `WorkerProfile.totalJobsCompleted` exists **but is never incremented**. It stays `0` forever. `feedback.service.ts:102` literally does `increment: 0`. |
| Commission collected per job | **No commission is taken anywhere.** `Booking.finalPrice` is the full amount; the platform earns Rs. 0. |
| A real wallet to credit cashback into | The "wallet" (`workers.service.ts:457`) is **faked** — `availableBalance = totalEarnings`, recomputed by summing completed bookings. No stored balance, no ledger, no withdrawals. |
| Payment release ("Step 4: payment released") | **No payment / escrow record exists.** Money never flows through the platform. |
| Completion rate ≥ 90%, cancellation rate < 10% | Not tracked. Cancellations aren't counted per worker. |
| "No active fraud reports" | `Complaint` model exists but isn't linked to a fraud flag or bonus eligibility. |
| Rating ≥ 4.5 gate | `averageRating` **is** maintained correctly (`feedback.service.ts`). ✅ This one works. |
| Tier / badge (Bronze→Platinum) | No field, no concept. |
| Search ranking by score (US-015) | Search currently orders by `createdAt` (`workers.service.ts:429`), not by any score. |
| Notification `type` (e.g. milestone) | `Notification` table has **no `type` column**; `type` is passed to the service but silently dropped. |

**Conclusion:** This is not a "add a bonus table" task. It's a financial subsystem.
The single most important decision — and the thing the PDFs completely skip — is
**how the platform actually collects its 10% commission in a cash-dominated market.**
Everything else (cashback, tiers, ranking) is downstream of that one decision.

---

## 1. The Pakistani-market problem the PDFs ignore: cash

The bonus math in the PDF is clean:

> Service = Rs. 5,000 → Commission (10%) = Rs. 500 → Worker gets Rs. 4,500
> Cashback = 10% of collected commission, returned to the worker.

This **only works if the platform holds the money.** In Pakistan, for an on-demand
"electrician comes to your house" marketplace, the overwhelming default is
**cash-on-delivery (COD)** — the customer hands cash directly to the worker.
The platform never touches it. So when does the platform get its Rs. 500?

You have three structural choices. Pick one *before* writing code.

### Option A — Worker prepaid wallet + commission ledger (RECOMMENDED for launch)
- Job is cash-COD as normal. Customer pays the worker Rs. 5,000 in hand.
- On job completion, the platform **debits Rs. 500 commission from the worker's
  wallet balance** (a real, stored balance).
- Workers **top up** the wallet via JazzCash / Easypaisa / Raast / bank transfer.
- If wallet goes below a threshold (e.g. < Rs. 0 or a small negative float), the
  worker can't receive new bookings until they top up.
- Cashback bonus = a **credit** back into the same wallet.

**Why this fits Pakistan:** matches how Bykea / inDrive / local marketplaces actually
operate. Cash stays cash; only the *commission* is digital. Workers are used to
"maintaining balance" (like mobile load). Low friction for customers (they pay cash).

### Option B — In-app digital payment / escrow
- Customer pays *through the app* (JazzCash/Easypaisa/Raast/card). Platform holds
  funds, deducts commission, releases Rs. 4,500 to the worker, keeps Rs. 500.
- Clean accounting, true escrow, enables dispute hold-backs.
- **Friction:** many Pakistani customers won't pay a tradesman online before the work
  is done; card penetration is low; trust is low at launch. Realistically a *phase 2*.

### Option C — Hybrid (target end-state)
- Support both. COD jobs use the wallet-debit model (A); customers who *choose* to
  pay digitally use escrow (B). Worker sees one unified wallet.

**My recommendation:** **Build Option A now**, design the schema so Option B/C drops in
later (the `WalletTransaction` ledger below already supports both). Don't block the
FYP/launch on payment-gateway integration.

> Note for the FYP/demo: you can ship Option A with a **simulated/manual top-up**
> (admin credits wallet, or a mock JazzCash button) and still demonstrate the entire
> commission → cashback → tier → ranking loop end-to-end. Real gateway integration is
> a clearly-scoped later step.

---

## 2. Recommended business parameters (Pakistan, launch)

Straight from the PDF, with launch-safe choices locked in:

| Parameter | Value | Notes |
|---|---|---|
| Commission | **10%** | PDF's recommended startup rate (8–12% band). Keep configurable. |
| Cashback (Bronze) | 10% of commission collected in the window | |
| Cashback (Silver) | 15% | |
| Cashback (Gold) | 20% | |
| Cashback (Platinum) | 25% | |
| Bonus window | every **20 completed jobs** (rolling) | **LOCKED: rolling.** Each time `totalJobsCompleted` crosses a multiple of 20, evaluate eligibility and pay cashback on the commission collected over **that 20-job window**, at the worker's current tier rate. Fired inside the completion transaction. |
| Min rating | **≥ 4.5** | Already tracked. |
| Completion rate | **≥ 90%** | New: completed ÷ (completed + cancelled-by-worker). |
| Cancellation rate | **< 10%** | Worker-initiated cancellations only. |
| Fraud reports | **0 active** | Tie to `Complaint` / a fraud flag. |

**Tiers (lifetime completed jobs):** Bronze 20 · Silver 50 · Gold 100 · Platinum 250.

### Worked example (model A, rolling-20)
- Worker completes their **20th** job (each ~Rs. 5,000). The completion transaction sees
  `totalJobsCompleted` cross 20 → bonus window triggers.
- Commission collected over those 20 jobs = 20 × Rs. 500 = **Rs. 10,000** (already debited
  from the wallet, one job at a time, as each completed).
- Worker is Bronze, rating 4.7, completion 95%, 0 fraud → **eligible**.
- Cashback = 10% × Rs. 10,000 = **Rs. 1,000**, credited to wallet **immediately**.
- Worker feels the reward the same day → exactly the retention behaviour the PDF wants.
- Next window evaluates at job 40, then 60, etc., each on its own 20-job commission slice.

This is the key property: **cashback is funded out of commission already collected**,
so it is self-financing and can never make the platform lose money. (PDF section 2.)

---

## 3. Data model changes (Prisma)

Add to `FYP_BACKEND/prisma/schema.prisma`. New models + a few fields.

### 3.1 Worker financial/stats fields
```prisma
model WorkerProfile {
  // ... existing fields ...
  walletBalance       Decimal  @default(0) @db.Decimal(12, 2) // real stored balance (PKR)
  currentTier         WorkerTier @default(NONE)
  jobsCancelledByWorker Int     @default(0)
  isBonusSuspended    Boolean  @default(false) // admin kill-switch (US-013)
  hasActiveFraud      Boolean  @default(false) // set when a fraud complaint is open
  lastBonusEvaluatedAt DateTime?

  wallet              WalletTransaction[]
  bonuses             BonusRecord[]
  // NOTE: totalJobsCompleted already exists — we will finally start incrementing it.
}

enum WorkerTier {
  NONE
  BRONZE
  SILVER
  GOLD
  PLATINUM
}
```

### 3.2 Wallet ledger — the source of truth for money
Replace the *derived* wallet with a real append-only ledger. Balance = running sum,
also cached on `WorkerProfile.walletBalance` for fast reads.

```prisma
model WalletTransaction {
  id          String        @id @default(uuid())
  workerId    String
  type        WalletTxnType
  amount      Decimal       @db.Decimal(12, 2) // signed: + credit, − debit
  balanceAfter Decimal      @db.Decimal(12, 2) // snapshot for audit
  bookingId   String?       // commission / earning linkage
  bonusId     String?       // cashback linkage
  description String
  createdAt   DateTime      @default(now())
  worker      WorkerProfile @relation(fields: [workerId], references: [id], onDelete: Cascade)

  @@index([workerId, createdAt])
}

enum WalletTxnType {
  COMMISSION_DEBIT   // platform takes its cut
  BONUS_CREDIT       // cashback paid in
  TOPUP_CREDIT       // worker added funds (JazzCash/Easypaisa/Raast)
  WITHDRAWAL_DEBIT   // worker cashed out (only meaningful in escrow mode)
  ADJUSTMENT         // admin correction
}
```

### 3.3 Commission per booking (for accounting + audit)
```prisma
model Booking {
  // ... existing fields ...
  commissionRate   Decimal? @db.Decimal(4, 3)  // e.g. 0.100, snapshotted at completion
  commissionAmount Decimal? @db.Decimal(10, 2) // finalPrice * rate
  completedAt      DateTime?
}
```

### 3.4 Bonus records (history — US-006)
```prisma
model BonusRecord {
  id                String      @id @default(uuid())
  workerId          String
  tier              WorkerTier
  windowIndex       Int         // 1 = jobs 1–20, 2 = jobs 21–40, ... (the rolling-20 slice)
  jobsInWindow      Int         @default(20)
  commissionCollected Decimal   @db.Decimal(12, 2) // commission over this 20-job slice
  cashbackRate      Decimal     @db.Decimal(4, 3) // 0.10 / 0.15 / 0.20 / 0.25
  bonusAmount       Decimal     @db.Decimal(12, 2)
  status            BonusStatus @default(PENDING)
  reason            String?     // why rejected, if not eligible
  createdAt         DateTime    @default(now())
  worker            WorkerProfile @relation(fields: [workerId], references: [id], onDelete: Cascade)

  @@unique([workerId, windowIndex]) // idempotency: each 20-job window paid at most once
  @@index([workerId])
}

enum BonusStatus {
  PENDING    // eligible, queued to pay
  PAID       // credited to wallet
  REJECTED   // failed eligibility (rating/fraud/etc.)
}
```

### 3.5 Configurable program settings (US-010, US-011)
Don't hard-code thresholds. One settings row admin can edit.
```prisma
model BonusConfig {
  id              Int      @id @default(1) // singleton
  commissionRate  Decimal  @default(0.100) @db.Decimal(4, 3)
  bronzeJobs      Int      @default(20)
  silverJobs      Int      @default(50)
  goldJobs        Int      @default(100)
  platinumJobs    Int      @default(250)
  bronzeCashback  Decimal  @default(0.10) @db.Decimal(4, 3)
  silverCashback  Decimal  @default(0.15) @db.Decimal(4, 3)
  goldCashback    Decimal  @default(0.20) @db.Decimal(4, 3)
  platinumCashback Decimal @default(0.25) @db.Decimal(4, 3)
  minRating       Decimal  @default(4.5) @db.Decimal(2, 1)
  minCompletionRate Decimal @default(0.90) @db.Decimal(4, 3)
  maxCancellationRate Decimal @default(0.10) @db.Decimal(4, 3)
  updatedAt       DateTime @updatedAt
}
```

### 3.6 Notification type (fixes existing silent bug)
```prisma
model Notification {
  // ... existing ...
  type String @default("GENERAL") // BONUS_MILESTONE, BONUS_EARNED, TIER_UP, LOW_BALANCE...
}
```
Then persist it in `notifications.service.ts` (currently dropped).

Migration: `npm run prisma:migrate` (name it `bonus_financial_system`), then
`npm run prisma:generate`.

---

## 4. The completion flow — where everything hooks in

This is the spine. The PDF's "Monthly Bonus Flow" (steps 1–6) maps to one place in
code: **the transition of a booking to `COMPLETED`**. Today that transition does almost
nothing. It must become the moment all stats update.

**The critical fix: completion must be customer-confirmed (US-008).** Right now any
status update goes through `updateBookingStatus`. Introduce an explicit
**customer confirmation** step so a worker can't inflate their own job count:

```
IN_PROGRESS  --(worker marks done)-->  PENDING_CONFIRMATION
PENDING_CONFIRMATION  --(customer confirms)-->  COMPLETED   ← stats fire here
```

Add `PENDING_CONFIRMATION` to `BookingStatus`. On the customer-confirm endpoint, run a
single transaction that does all of this (idempotently — guard against double-fire):

```ts
// pseudocode for bookings.service.ts -> confirmCompletion(bookingId, customerUserId)
await prisma.$transaction(async (tx) => {
  // 0. guard: booking must be PENDING_CONFIRMATION, customer must own it, not already counted
  const config = await tx.bonusConfig.findUnique({ where: { id: 1 } });
  const rate = config.commissionRate;            // 0.100
  const finalPrice = booking.finalPrice;
  const commission = finalPrice * rate;          // 500

  // 1. mark completed
  await tx.booking.update({ where: { id }, data: {
    status: 'COMPLETED', completedAt: new Date(),
    commissionRate: rate, commissionAmount: commission,
  }});

  // 2. increment lifetime jobs (FINALLY)
  // 3. debit commission from wallet (Option A) + write ledger row
  const worker = await tx.workerProfile.update({
    where: { id: booking.workerId },
    data: {
      totalJobsCompleted: { increment: 1 },
      walletBalance: { decrement: commission },
    },
  });
  await tx.walletTransaction.create({ data: {
    workerId: booking.workerId, type: 'COMMISSION_DEBIT',
    amount: commission.negated(), balanceAfter: worker.walletBalance,
    bookingId: id, description: `Commission for ${service.name}`,
  }});

  // 4. recompute tier from new totalJobsCompleted -> notify on tier-up (US-004)
  // 5. ROLLING-20 TRIGGER: if totalJobsCompleted is now a multiple of 20,
  //    evaluate this window's bonus in-line (see §5). Same transaction = atomic + idempotent.
  // 6. (rating already handled when feedback is later submitted)
});
// 7. push notifications: milestone progress (US-014), low-balance warning if applicable
```

Also: when a **worker cancels** an accepted job, increment `jobsCancelledByWorker`
(feeds completion/cancellation rate). Customer cancellations don't count against the worker.

---

## 5. The bonus engine (event-driven — rolling 20 jobs)

**LOCKED decision: bonus is a trigger, not a cron.** It fires from inside the
completion transaction (§4, step 5) the instant `totalJobsCompleted` crosses a multiple
of 20. New module: `src/modules/bonus/`, exposing `evaluateWindow(tx, worker)` that the
booking-completion flow calls. No `@nestjs/schedule` needed for the bonus itself.

```ts
// bonus.service.ts -> evaluateWindow(tx, worker)   // called within the completion txn
// Precondition: worker.totalJobsCompleted just became a multiple of 20.
const windowIndex = worker.totalJobsCompleted / 20;     // 1, 2, 3, ...

// idempotency guard: @@unique([workerId, windowIndex]) — skip if this window already exists
const already = await tx.bonusRecord.findUnique({
  where: { workerId_windowIndex: { workerId: worker.id, windowIndex } },
});
if (already) return;

// commission collected over THIS 20-job slice = sum of the last 20 COMMISSION_DEBIT rows
const commission = sumLast20JobCommissions(tx, worker.id);

// completion / cancellation rates are lifetime ratios (cheap to compute)
const completionRate = completed / (completed + cancelledByWorker);
const cancelRate     = cancelledByWorker / (completed + cancelledByWorker);

const eligible =
  Number(worker.averageRating) >= config.minRating &&   // ≥ 4.5
  completionRate >= config.minCompletionRate &&         // ≥ 90%
  cancelRate < config.maxCancellationRate &&            // < 10%
  !worker.hasActiveFraud &&                             // 0 fraud (US-009)
  !worker.isBonusSuspended;                             // admin gate (US-013)

if (!eligible) {
  // record the window as REJECTED with a human reason — window is consumed, not retried
  await tx.bonusRecord.create({ data: { ...window, status: 'REJECTED', reason } });
  return;
}

const cashbackRate = rateForTier(worker.currentTier);   // 0.10 / 0.15 / 0.20 / 0.25
const bonus = commission * cashbackRate;

// atomic: record + credit wallet + ledger row, all in the same tx
await tx.bonusRecord.create({ data: { ...window, status: 'PAID', bonusAmount: bonus } });
await tx.workerProfile.update({ where: { id: worker.id },
  data: { walletBalance: { increment: bonus } } });
await tx.walletTransaction.create({ data: {
  workerId: worker.id, type: 'BONUS_CREDIT', amount: bonus,
  balanceAfter: newBalance, description: `Tier ${worker.currentTier} cashback (jobs ${windowIndex*20-19}–${windowIndex*20})`,
}});
// after txn commits: notify "You earned Rs. {bonus} cashback!" (type BONUS_EARNED, US-003)
```

**Design choice for rolling windows:** if a worker hits 20 jobs but *isn't* eligible
(e.g. rating 4.4), that window is recorded `REJECTED` and **consumed** — the commission
slice is forfeited, not carried forward. This keeps idempotency simple (`windowIndex`)
and gives the worker a concrete, dated reason to improve before the next window. If you
later want "missed windows get a second chance," that's a deliberate add-on, not the default.

**Eligibility gating belongs in code, evaluated atomically inside the completion txn,
logged as a `BonusRecord` with a `reason` even when rejected** — so a worker who *just
missed* can be shown why. That transparency is what drives the retention behaviour the
PDF's section 2 is after.

> An optional nightly `@Cron` can still exist as a **safety sweep** (recompute
> `hasActiveFraud`, refresh ranking score) — but it does **not** pay bonuses. Bonuses are
> paid only at the moment of the 20th/40th/… completion.

---

## 6. Search ranking (US-015 + PDF section 6)

Replace the `orderBy: createdAt` in worker search with the PDF's weighted score.
Two viable approaches:

- **Compute-and-store (recommended):** maintain a `rankingScore Decimal` column on
  `WorkerProfile`, recomputed on completion / feedback / month-end. Search just does
  `orderBy: { rankingScore: 'desc' }` — fast, paginates correctly in SQL.
- Compute-on-read: only OK at small scale; breaks pagination.

Score (from the PDF's Java, ported):
```
ratingScore   = averageRating / 5
jobsScore     = min(totalJobsCompleted / 200, 1)
responseScore = FAST 1.0 | MEDIUM 0.6 | SLOW 0.3
repeatScore   = repeatCustomerRate / 100
score = 0.40*rating + 0.30*jobs + 0.20*response + 0.10*repeat
```
**Gap:** `responseTime` and `repeatCustomerRate` aren't tracked yet.
- *Response time:* measure median minutes from booking-created → worker's first action
  (proposal/accept). Bucket into FAST/MEDIUM/SLOW. (Phase 2 — until then default MEDIUM.)
- *Repeat customers:* `distinct customers with ≥2 completed bookings ÷ distinct customers`.
  Computable today from `Booking`. (Phase 2.)

For launch, ship score with rating+jobs (the 70% that's real data) and stub
response/repeat at neutral values; wire the other two in phase 2 without changing the formula.

---

## 7. API surface (new endpoints)

| Method | Route | Actor | Purpose | Story |
|---|---|---|---|---|
| GET | `/workers/:id/bonus/progress` | Worker | jobs done, target, % to next tier, current tier | US-001,002,004 |
| GET | `/workers/:id/bonus/history` | Worker | list `BonusRecord` | US-006 |
| GET | `/workers/:id/wallet/summary` | Worker | **real** balance (replaces faked one) | US-005 |
| GET | `/workers/:id/wallet/transactions` | Worker | ledger from `WalletTransaction` | — |
| POST | `/workers/:id/wallet/topup` | Worker | initiate JazzCash/Easypaisa/Raast top-up | — |
| PATCH | `/bookings/:id/confirm-completion` | Customer | the stat-firing event | US-008 |
| GET | `/admin/bonus/config` / PATCH | Admin | edit thresholds & rates | US-010,011 |
| GET | `/admin/bonus/analytics` | Admin | total bonuses paid vs commission earned | US-012 |
| PATCH | `/admin/workers/:id/bonus-suspend` | Admin | suspend eligibility | US-013 |
| POST | `/admin/bonus/reevaluate/:workerId` | Admin | re-run window eval for a worker (testing/repair) | — |

The faked `getWalletSummary`/`getWalletTransactions` in `workers.service.ts:457-542`
get **rewritten** to read the new ledger instead of summing bookings.

---

## 8. Frontend (Next.js)

- **Worker dashboard — Rewards tab:** progress bar (US-002) `(totalJobsCompleted % 20) / 20`
  toward the next 20-job cashback, tier
  badge (Bronze→Platinum, US-004), wallet balance + ledger, bonus history (US-006).
  Bilingual EN/Urdu like the rest of the app.
- **Milestone toasts / notifications** at 25/50/75/100% (US-014) — driven by the
  `type`-tagged notifications + existing Socket.IO `emitNotification`.
- **Worker public profile & search cards:** show tier badge (US-007) so customers see
  trust signals.
- **Low-balance banner:** if `walletBalance` near/below zero, prompt top-up (this is the
  Pakistani-market enforcement mechanism for commission collection).
- Reuse the existing `apiClient` singleton + service-module pattern (`src/api/services/`).

---

## 9. Anti-abuse (non-negotiable for a money feature)

The PDF's US-008/009 exist for a reason — bonus money invites fraud:

1. **Jobs count only after customer confirmation** (§4). A worker can't self-complete.
2. **Idempotency:** completion stat-update guarded so a booking can't be counted twice;
   `BonusRecord` has `@@unique([workerId, windowIndex])` so each 20-job window pays once.
3. **Collusion check (phase 2):** flag worker+customer pairs with abnormally many mutual
   bookings (fake jobs to farm tier). Cap repeat-customer contribution.
4. **Fraud freeze:** opening a fraud `Complaint` sets `hasActiveFraud = true` → instantly
   ineligible until admin resolves.
5. **Wallet can't go arbitrarily negative:** below threshold → worker stops getting
   bookings until top-up (protects platform's commission receivable).
6. **All money moves are ledger rows** — every credit/debit auditable, never a bare
   `balance = x` write.

---

## 10. Build order (phased — ship value early)

**Phase 1 — Money foundation (do first, nothing works without it)**
1. Schema: `WalletTransaction`, `Booking.commission*`, `WorkerProfile.walletBalance`,
   `Notification.type`. Migrate.
2. `PENDING_CONFIRMATION` status + customer `confirm-completion` endpoint.
3. Increment `totalJobsCompleted` + debit commission + ledger row, in one transaction.
4. Replace faked wallet read with real ledger.
5. Mock / admin top-up (no real gateway yet — locked decision).

**Phase 2 — Bonus engine (event-driven, rolling-20)**
6. `BonusConfig` (seed singleton), `BonusRecord` (windowIndex), `WorkerTier`.
7. Tier recompute on completion + tier-up notification.
8. `evaluateWindow()` called from the completion txn when `totalJobsCompleted % 20 == 0`,
   with full eligibility gating (rating/completion/cancel/fraud). No cron.
9. Worker Rewards UI: progress to next 20, tier badge, history; milestone notifications.

**Phase 3 — Ranking & trust**
10. `rankingScore` column + weighted formula; switch search ordering.
11. Tier badges on profile/search cards (customer-facing).
12. Response-time + repeat-customer tracking → complete the 4-factor score.

**Phase 4 — Admin & real payments**
13. Admin config screen, bonus analytics (paid vs earned), suspend control.
14. Real JazzCash / Easypaisa / Raast top-up integration (replace mock).
15. Optional: digital-payment escrow path (Option B) for customers who opt in.

---

## 11. Decisions

**Resolved (locked):**
1. ✅ Commission collection — **Wallet debit** (§1, Option A).
2. ✅ Bonus cadence — **Every 20 jobs, rolling / event-driven** (§5).
3. ✅ Demo top-up — **Mock / admin credit** (real gateway = Phase 4).

**Still open (small, can decide during Phase 1):**
4. **Wallet negative floor:** how far below zero before a worker is blocked from new
   bookings? Suggested default: block at any negative balance (`walletBalance < 0`), with
   a grace banner. Pick a number when wiring step 5.
5. **Rejected-window policy:** confirmed default is *consume & forfeit* (§5). Flag now if
   you'd rather missed windows get a retry.

Phase 1 is ready to start whenever you give the go.
