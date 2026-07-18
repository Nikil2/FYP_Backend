import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommissionPaymentStatus, WalletTxnType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';

const COMMISSION_DUE_DAYS = 15;

@Injectable()
export class CommissionService {
  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Called after every COMMISSION_DEBIT (inside confirmCompletion).
   * If the worker has no commissionDueAt set yet, starts the 15-day clock.
   */
  async ensureDueDateSet(workerId: string) {
    const worker = await this.prisma.workerProfile.findUnique({
      where: { id: workerId },
      select: { commissionDueAt: true },
    });
    if (!worker) return;

    const due = await this.getDueStatus(workerId);
    const owes = due.amountDue > 0;
    const alreadySet = !!worker.commissionDueAt;

    if (owes && !alreadySet) {
      const dueAt = new Date();
      dueAt.setDate(dueAt.getDate() + COMMISSION_DUE_DAYS);
      await this.prisma.workerProfile.update({
        where: { id: workerId },
        data: { commissionDueAt: dueAt },
      });
    }
  }

  /**
   * What the worker owes right now + deadline info.
   */
  async getDueStatus(workerId: string) {
    const worker = await this.prisma.workerProfile.findUnique({
      where: { id: workerId },
      select: {
        walletBalance: true,
        commissionDueAt: true,
        isPaymentOverdue: true,
        totalJobsCompleted: true,
      },
    });
    if (!worker) throw new NotFoundException('Worker not found');

    // Calculate commission owed from actual transactions, not walletBalance.
    // walletBalance can be inflated by bonuses/top-ups — this gives the real number.
    const [totalDebited, totalApproved, pendingPayment] = await Promise.all([
      // Total commission charged across all completed jobs
      this.prisma.walletTransaction.aggregate({
        where: { workerId, type: WalletTxnType.COMMISSION_DEBIT },
        _sum: { amount: true },
      }),
      // Total commission already verified and cleared by admin
      this.prisma.commissionPayment.aggregate({
        where: { workerId, status: CommissionPaymentStatus.APPROVED },
        _sum: { amount: true },
      }),
      // Any pending submission right now
      this.prisma.commissionPayment.findFirst({
        where: { workerId, status: CommissionPaymentStatus.PENDING },
        orderBy: { submittedAt: 'desc' },
      }),
    ]);

    const totalCommissionCharged = Math.abs(Number(totalDebited._sum.amount ?? 0));
    const totalCommissionCleared = Number(totalApproved._sum.amount ?? 0);
    const amountDue = Math.max(0, totalCommissionCharged - totalCommissionCleared);

    const daysLeft = worker.commissionDueAt
      ? Math.ceil(
          (new Date(worker.commissionDueAt).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        )
      : null;

    return {
      amountDue,
      totalCommissionCharged,
      totalCommissionCleared,
      commissionDueAt: worker.commissionDueAt,
      daysLeft,
      isPaymentOverdue: worker.isPaymentOverdue,
      hasPendingSubmission: !!pendingPayment,
      pendingPayment: pendingPayment ?? null,
    };
  }

  /**
   * Worker submits a payment proof screenshot.
   * Validates they actually owe money and don't have a pending submission.
   */
  async submitPaymentProof(workerId: string, proofImageUrl: string) {
    const worker = await this.prisma.workerProfile.findUnique({
      where: { id: workerId },
      select: { commissionDueAt: true, userId: true },
    });
    if (!worker) throw new NotFoundException('Worker not found');

    const due = await this.getDueStatus(workerId);
    if (due.amountDue <= 0) {
      throw new BadRequestException('No commission is currently owed');
    }
    const amountDue = due.amountDue;

    const existing = await this.prisma.commissionPayment.findFirst({
      where: { workerId, status: CommissionPaymentStatus.PENDING },
    });
    if (existing) {
      throw new BadRequestException(
        'You already have a payment under review. Please wait for admin approval.',
      );
    }

    const now = new Date();
    const dueDate = worker.commissionDueAt ?? new Date(now.getTime() + COMMISSION_DUE_DAYS * 86400000);

    // Period: find the earliest unpaid commission debit
    const firstDebit = await this.prisma.walletTransaction.findFirst({
      where: { workerId, type: WalletTxnType.COMMISSION_DEBIT },
      orderBy: { createdAt: 'asc' },
    });

    const payment = await this.prisma.commissionPayment.create({
      data: {
        workerId,
        amount: amountDue,
        proofImageUrl,
        dueDate,
        periodStart: firstDebit?.createdAt ?? now,
        periodEnd: now,
      },
    });

    return payment;
  }

  /**
   * All commission payments for a worker (history).
   */
  async getWorkerPayments(workerId: string, skip = 0, take = 20) {
    const [data, total] = await Promise.all([
      this.prisma.commissionPayment.findMany({
        where: { workerId },
        orderBy: { submittedAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.commissionPayment.count({ where: { workerId } }),
    ]);
    return { data, total };
  }

  // ─── ADMIN ────────────────────────────────────────────────────────────────

  /**
   * All pending payment proofs for admin review.
   */
  async getPendingPayments(skip = 0, take = 20) {
    const [data, total] = await Promise.all([
      this.prisma.commissionPayment.findMany({
        where: { status: CommissionPaymentStatus.PENDING },
        include: {
          worker: {
            select: {
              id: true,
              walletBalance: true,
              user: { select: { fullName: true, phoneNumber: true, profilePicUrl: true } },
            },
          },
        },
        orderBy: { submittedAt: 'asc' },
        skip,
        take,
      }),
      this.prisma.commissionPayment.count({
        where: { status: CommissionPaymentStatus.PENDING },
      }),
    ]);
    return { data, total };
  }

  /**
   * Admin approves a payment:
   * 1. Marks CommissionPayment as APPROVED
   * 2. Credits the worker wallet by exact payment amount (clears the debt)
   * 3. Resets commissionDueAt and isPaymentOverdue on WorkerProfile
   */
  async approvePayment(paymentId: string, adminUserId: string) {
    const payment = await this.prisma.commissionPayment.findUnique({
      where: { id: paymentId },
      include: { worker: { select: { id: true, userId: true, walletBalance: true } } },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== CommissionPaymentStatus.PENDING) {
      throw new BadRequestException('Payment is no longer pending');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.commissionPayment.update({
        where: { id: paymentId },
        data: {
          status: CommissionPaymentStatus.APPROVED,
          reviewedAt: new Date(),
          reviewedBy: adminUserId,
        },
      });

      // Credit the wallet to clear the debt
      await this.walletService.adjust(
        {
          workerId: payment.workerId,
          type: WalletTxnType.TOPUP_CREDIT,
          amount: Number(payment.amount),
          description: `Commission payment verified — Rs. ${payment.amount}`,
        },
        tx,
      );

      // Reset the due date clock
      await tx.workerProfile.update({
        where: { id: payment.workerId },
        data: { commissionDueAt: null, isPaymentOverdue: false },
      });
    });

    await this.notificationsService.createNotification(
      payment.worker.userId,
      'Payment Verified',
      `Your commission payment of Rs. ${payment.amount} has been approved. Your account is clear.`,
      'COMMISSION_APPROVED',
    );

    return { success: true };
  }

  /**
   * Admin rejects a payment — worker must resubmit with correct proof.
   */
  async rejectPayment(paymentId: string, adminUserId: string, reason: string) {
    const payment = await this.prisma.commissionPayment.findUnique({
      where: { id: paymentId },
      include: { worker: { select: { userId: true } } },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== CommissionPaymentStatus.PENDING) {
      throw new BadRequestException('Payment is no longer pending');
    }

    await this.prisma.commissionPayment.update({
      where: { id: paymentId },
      data: {
        status: CommissionPaymentStatus.REJECTED,
        reviewedAt: new Date(),
        reviewedBy: adminUserId,
        rejectionReason: reason,
      },
    });

    await this.notificationsService.createNotification(
      payment.worker.userId,
      'Payment Rejected',
      `Your commission payment proof was rejected. Reason: ${reason}. Please resubmit.`,
      'COMMISSION_REJECTED',
    );

    return { success: true };
  }

  /**
   * Flag a single worker if their due date has passed and they still owe money.
   *
   * Called when the worker opens their own wallet, so the overdue banner and
   * notification fire even if no admin has run a sweep. Kept separate from
   * `getDueStatus` so that stays a pure read (the sweep depends on it).
   */
  async flagWorkerIfOverdue(workerId: string) {
    const worker = await this.prisma.workerProfile.findUnique({
      where: { id: workerId },
      select: { id: true, userId: true, commissionDueAt: true, isPaymentOverdue: true },
    });

    if (!worker) return;
    if (worker.isPaymentOverdue) return; // already flagged
    if (!worker.commissionDueAt) return; // clock never started
    if (new Date(worker.commissionDueAt).getTime() > Date.now()) return; // not yet due

    const due = await this.getDueStatus(workerId);
    if (due.amountDue <= 0) return; // nothing actually owed

    await this.prisma.workerProfile.update({
      where: { id: workerId },
      data: { isPaymentOverdue: true },
    });

    await this.notificationsService.createNotification(
      worker.userId,
      'Commission Overdue',
      'Your commission payment is overdue. Please pay immediately to continue receiving bookings.',
      'COMMISSION_OVERDUE',
    );
  }

  /**
   * Admin view: every worker currently flagged as overdue on commission, with
   * the amount owed and how long they've been late — so an admin can decide
   * whether to block, warn, or leave alone.
   *
   * Re-runs the overdue sweep first, so the list is accurate at the moment the
   * admin looks at it. That's what keeps this correct without a cron daemon:
   * flags can go stale between visits, but never while being read.
   */
  async getOverdueWorkers() {
    const { flagged } = await this.flagOverdueWorkers();

    const workers = await this.prisma.workerProfile.findMany({
      where: { isPaymentOverdue: true },
      select: {
        id: true,
        commissionDueAt: true,
        city: true,
        totalJobsCompleted: true,
        isBonusSuspended: true,
        user: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            isBlocked: true,
          },
        },
      },
      orderBy: { commissionDueAt: 'asc' }, // longest overdue first
    });

    const now = Date.now();

    const rows = await Promise.all(
      workers.map(async (worker) => {
        const due = await this.getDueStatus(worker.id);
        const daysOverdue = worker.commissionDueAt
          ? Math.floor(
              (now - new Date(worker.commissionDueAt).getTime()) /
                (1000 * 60 * 60 * 24),
            )
          : 0;

        return {
          workerId: worker.id,
          userId: worker.user.id,
          fullName: worker.user.fullName,
          phoneNumber: worker.user.phoneNumber,
          city: worker.city,
          totalJobsCompleted: worker.totalJobsCompleted,
          amountDue: due.amountDue,
          commissionDueAt: worker.commissionDueAt,
          daysOverdue,
          hasPendingSubmission: due.hasPendingSubmission,
          isBlocked: worker.user.isBlocked,
          isBonusSuspended: worker.isBonusSuspended,
        };
      }),
    );

    // A worker who has already submitted proof is awaiting admin review, not
    // ignoring the bill — surface them separately rather than as a defaulter.
    return {
      newlyFlagged: flagged,
      totalOverdue: rows.length,
      totalAmountOwed: rows.reduce((sum, row) => sum + row.amountDue, 0),
      awaitingReview: rows.filter((row) => row.hasPendingSubmission).length,
      workers: rows,
    };
  }

  /**
   * Daily job: flag overdue workers.
   * Called by a scheduler — not exposed via HTTP.
   */
  async flagOverdueWorkers() {
    const now = new Date();
    // Find workers whose due date has passed and who haven't been flagged yet
    const candidates = await this.prisma.workerProfile.findMany({
      where: {
        commissionDueAt: { lte: now },
        isPaymentOverdue: false,
      },
      select: { id: true, userId: true },
    });

    let flagged = 0;
    for (const worker of candidates) {
      // Verify they actually owe money (don't rely on walletBalance)
      const due = await this.getDueStatus(worker.id);
      if (due.amountDue <= 0) continue;

      await this.prisma.workerProfile.update({
        where: { id: worker.id },
        data: { isPaymentOverdue: true },
      });
      await this.notificationsService.createNotification(
        worker.userId,
        'Commission Overdue',
        'Your commission payment is overdue. Please pay immediately to continue receiving bookings.',
        'COMMISSION_OVERDUE',
      );
      flagged++;
    }

    return { flagged };
  }
}
