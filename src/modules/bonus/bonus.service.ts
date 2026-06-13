import { Injectable, NotFoundException } from '@nestjs/common';
import {
  BonusConfig,
  BonusStatus,
  Prisma,
  WalletTxnType,
  WorkerProfile,
  WorkerTier,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';

/**
 * Result of evaluating a worker's stats inside the completion transaction.
 * Notifications are emitted by the caller AFTER the transaction commits.
 */
export interface BonusEvaluationResult {
  tierChanged: boolean;
  newTier: WorkerTier;
  bonusPaid: boolean;
  bonusAmount: number;
  windowIndex: number | null;
  milestonePercent: number | null; // 25 / 50 / 75 when a progress milestone is hit
}

const WINDOW_SIZE = 20;

@Injectable()
export class BonusService {
  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
  ) {}

  /** Read the singleton config (creates it with defaults if missing). */
  async getConfig(client?: Prisma.TransactionClient): Promise<BonusConfig> {
    const db = client ?? this.prisma;
    const existing = await db.bonusConfig.findUnique({ where: { id: 1 } });
    if (existing) return existing;
    return db.bonusConfig.create({ data: { id: 1 } });
  }

  /** Tier a worker qualifies for based on lifetime completed jobs. */
  tierForJobs(jobs: number, config: BonusConfig): WorkerTier {
    if (jobs >= config.platinumJobs) return WorkerTier.PLATINUM;
    if (jobs >= config.goldJobs) return WorkerTier.GOLD;
    if (jobs >= config.silverJobs) return WorkerTier.SILVER;
    if (jobs >= config.bronzeJobs) return WorkerTier.BRONZE;
    return WorkerTier.NONE;
  }

  /** Cashback rate (0..1) for a tier. */
  cashbackRateForTier(tier: WorkerTier, config: BonusConfig): number {
    switch (tier) {
      case WorkerTier.PLATINUM:
        return Number(config.platinumCashback);
      case WorkerTier.GOLD:
        return Number(config.goldCashback);
      case WorkerTier.SILVER:
        return Number(config.silverCashback);
      case WorkerTier.BRONZE:
        return Number(config.bronzeCashback);
      default:
        return Number(config.bronzeCashback);
    }
  }

  /**
   * Called INSIDE the booking-completion transaction, AFTER totalJobsCompleted
   * has been incremented. Recomputes tier and, every 20th job, evaluates and pays
   * the rolling-window cashback. Returns info for post-commit notifications.
   *
   * `worker` must reflect the freshly-incremented totalJobsCompleted.
   */
  async processCompletion(
    tx: Prisma.TransactionClient,
    worker: WorkerProfile,
  ): Promise<BonusEvaluationResult> {
    const config = await this.getConfig(tx);
    const jobs = worker.totalJobsCompleted;

    const result: BonusEvaluationResult = {
      tierChanged: false,
      newTier: worker.currentTier,
      bonusPaid: false,
      bonusAmount: 0,
      windowIndex: null,
      milestonePercent: null,
    };

    // --- 1. tier recompute ---
    const qualifiedTier = this.tierForJobs(jobs, config);
    if (qualifiedTier !== worker.currentTier) {
      await tx.workerProfile.update({
        where: { id: worker.id },
        data: { currentTier: qualifiedTier },
      });
      result.tierChanged = true;
      result.newTier = qualifiedTier;
    }

    // --- 2. progress milestone (25/50/75% toward next window) ---
    const inWindow = jobs % WINDOW_SIZE; // 0 means a window just closed
    if (inWindow === 5) result.milestonePercent = 25;
    else if (inWindow === 10) result.milestonePercent = 50;
    else if (inWindow === 15) result.milestonePercent = 75;

    // --- 3. rolling-20 bonus window ---
    if (jobs > 0 && inWindow === 0) {
      const windowIndex = jobs / WINDOW_SIZE;
      result.windowIndex = windowIndex;

      // idempotency: each window paid at most once
      const existing = await tx.bonusRecord.findUnique({
        where: { workerId_windowIndex: { workerId: worker.id, windowIndex } },
      });
      if (existing) return result;

      // commission collected over this 20-job slice
      const lastJobs = await tx.booking.findMany({
        where: { workerId: worker.id, status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
        take: WINDOW_SIZE,
        select: { commissionAmount: true },
      });
      const commissionCollected = lastJobs.reduce(
        (sum, b) => sum + Number(b.commissionAmount ?? 0),
        0,
      );

      // eligibility gates
      const completed = worker.totalJobsCompleted;
      const cancelled = worker.jobsCancelledByWorker;
      const denom = completed + cancelled;
      const completionRate = denom === 0 ? 1 : completed / denom;
      const cancelRate = denom === 0 ? 0 : cancelled / denom;

      const tier = result.newTier; // use up-to-date tier
      const cashbackRate = this.cashbackRateForTier(tier, config);

      const reasons: string[] = [];
      if (Number(worker.averageRating) < Number(config.minRating))
        reasons.push(`rating below ${config.minRating}`);
      if (completionRate < Number(config.minCompletionRate))
        reasons.push('completion rate below 90%');
      if (cancelRate >= Number(config.maxCancellationRate))
        reasons.push('cancellation rate too high');
      if (worker.hasActiveFraud) reasons.push('active fraud report');
      if (worker.isBonusSuspended) reasons.push('bonus suspended by admin');

      if (reasons.length > 0) {
        await tx.bonusRecord.create({
          data: {
            workerId: worker.id,
            tier,
            windowIndex,
            commissionCollected,
            cashbackRate,
            bonusAmount: 0,
            status: BonusStatus.REJECTED,
            reason: reasons.join('; '),
          },
        });
        return result;
      }

      const bonusAmount = Math.round(commissionCollected * cashbackRate * 100) / 100;
      const bonus = await tx.bonusRecord.create({
        data: {
          workerId: worker.id,
          tier,
          windowIndex,
          commissionCollected,
          cashbackRate,
          bonusAmount,
          status: BonusStatus.PAID,
        },
      });

      if (bonusAmount > 0) {
        await this.walletService.adjust(
          {
            workerId: worker.id,
            type: WalletTxnType.BONUS_CREDIT,
            amount: bonusAmount,
            description: `${tier} cashback — jobs ${windowIndex * 20 - 19}–${
              windowIndex * 20
            }`,
            bonusId: bonus.id,
          },
          tx,
        );
      }

      result.bonusPaid = true;
      result.bonusAmount = bonusAmount;
    }

    return result;
  }

  /**
   * Progress view for the worker dashboard (US-001, US-002, US-004).
   */
  async getProgress(workerId: string) {
    const worker = await this.prisma.workerProfile.findUnique({
      where: { id: workerId },
      select: {
        id: true,
        totalJobsCompleted: true,
        currentTier: true,
        averageRating: true,
        jobsCancelledByWorker: true,
        walletBalance: true,
        hasActiveFraud: true,
        isBonusSuspended: true,
      },
    });
    if (!worker) {
      throw new NotFoundException(`Worker with ID ${workerId} not found`);
    }

    const config = await this.getConfig();
    const jobs = worker.totalJobsCompleted;
    const jobsInWindow = jobs % WINDOW_SIZE;
    const jobsToNextBonus = jobsInWindow === 0 && jobs > 0 ? 0 : WINDOW_SIZE - jobsInWindow;

    // next tier threshold
    const thresholds: { tier: WorkerTier; jobs: number }[] = [
      { tier: WorkerTier.BRONZE, jobs: config.bronzeJobs },
      { tier: WorkerTier.SILVER, jobs: config.silverJobs },
      { tier: WorkerTier.GOLD, jobs: config.goldJobs },
      { tier: WorkerTier.PLATINUM, jobs: config.platinumJobs },
    ];
    const nextTier = thresholds.find((t) => jobs < t.jobs) ?? null;

    return {
      workerId,
      totalJobsCompleted: jobs,
      currentTier: worker.currentTier,
      walletBalance: worker.walletBalance,
      bonusWindow: {
        size: WINDOW_SIZE,
        jobsInWindow,
        jobsToNextBonus,
        progressPercent: Math.round((jobsInWindow / WINDOW_SIZE) * 100),
      },
      nextTier: nextTier
        ? { tier: nextTier.tier, jobsRemaining: nextTier.jobs - jobs }
        : null,
      eligibility: {
        rating: Number(worker.averageRating),
        minRating: Number(config.minRating),
        ratingOk: Number(worker.averageRating) >= Number(config.minRating),
        hasActiveFraud: worker.hasActiveFraud,
        isBonusSuspended: worker.isBonusSuspended,
      },
    };
  }

  /**
   * Bonus history for the worker (US-006).
   */
  async getHistory(workerId: string, skip = 0, take = 20) {
    const [data, total] = await Promise.all([
      this.prisma.bonusRecord.findMany({
        where: { workerId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.bonusRecord.count({ where: { workerId } }),
    ]);
    return { data, total };
  }
}
