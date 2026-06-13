import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, WalletTxnType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Parameters for a single ledger movement.
 * `amount` is SIGNED: positive = credit (money in), negative = debit (money out).
 */
export interface WalletAdjustment {
  workerId: string;
  type: WalletTxnType;
  amount: Prisma.Decimal.Value; // signed
  description: string;
  bookingId?: string;
  bonusId?: string;
}

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  /**
   * The ONE function every money movement goes through.
   * Updates WorkerProfile.walletBalance and writes an append-only WalletTransaction
   * row with a balance snapshot — atomically.
   *
   * Pass a transaction client (`tx`) when this is part of a larger transaction
   * (e.g. booking completion). Omit it for standalone moves (e.g. top-up).
   */
  async adjust(
    adjustment: WalletAdjustment,
    tx?: Prisma.TransactionClient,
  ): Promise<{ balanceAfter: Prisma.Decimal; transactionId: string }> {
    const run = async (client: Prisma.TransactionClient) => {
      const worker = await client.workerProfile.update({
        where: { id: adjustment.workerId },
        data: { walletBalance: { increment: adjustment.amount } },
        select: { walletBalance: true },
      });

      const txn = await client.walletTransaction.create({
        data: {
          workerId: adjustment.workerId,
          type: adjustment.type,
          amount: adjustment.amount,
          balanceAfter: worker.walletBalance,
          bookingId: adjustment.bookingId,
          bonusId: adjustment.bonusId,
          description: adjustment.description,
        },
      });

      return { balanceAfter: worker.walletBalance, transactionId: txn.id };
    };

    return tx ? run(tx) : this.prisma.$transaction(run);
  }

  /**
   * Top up the worker's wallet (mock / admin credit for now — no real gateway yet).
   */
  async topup(workerId: string, amount: number) {
    if (!amount || amount <= 0) {
      throw new BadRequestException('Top-up amount must be greater than zero');
    }

    const worker = await this.prisma.workerProfile.findUnique({
      where: { id: workerId },
      select: { id: true },
    });
    if (!worker) {
      throw new NotFoundException(`Worker with ID ${workerId} not found`);
    }

    const result = await this.adjust({
      workerId,
      type: WalletTxnType.TOPUP_CREDIT,
      amount,
      description: `Wallet top-up of Rs. ${amount}`,
    });

    return {
      workerId,
      amountAdded: amount,
      balance: result.balanceAfter,
    };
  }

  /**
   * Wallet summary backed by the REAL ledger (replaces the old derived version).
   * - balance: platform credit the worker holds (top-ups − commission + bonuses).
   * - totalEarnings: gross cash the worker earned from completed jobs (paid in hand).
   */
  async getSummary(workerId: string) {
    const worker = await this.prisma.workerProfile.findUnique({
      where: { id: workerId },
      select: { id: true, walletBalance: true },
    });
    if (!worker) {
      throw new NotFoundException(`Worker with ID ${workerId} not found`);
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [completedAgg, monthAgg, commissionAgg, bonusAgg] = await Promise.all([
      this.prisma.booking.aggregate({
        where: { workerId, status: 'COMPLETED' },
        _sum: { finalPrice: true, commissionAmount: true },
      }),
      this.prisma.booking.aggregate({
        where: {
          workerId,
          status: 'COMPLETED',
          completedAt: { gte: monthStart },
        },
        _sum: { finalPrice: true },
      }),
      this.prisma.walletTransaction.aggregate({
        where: { workerId, type: 'COMMISSION_DEBIT' },
        _sum: { amount: true },
      }),
      this.prisma.walletTransaction.aggregate({
        where: { workerId, type: 'BONUS_CREDIT' },
        _sum: { amount: true },
      }),
    ]);

    return {
      workerId,
      balance: worker.walletBalance, // real platform credit
      availableBalance: worker.walletBalance, // alias kept for existing frontend
      totalEarnings: completedAgg._sum.finalPrice ?? 0, // gross cash from jobs
      thisMonthEarnings: monthAgg._sum.finalPrice ?? 0,
      totalCommissionPaid: commissionAgg._sum.amount
        ? commissionAgg._sum.amount.abs()
        : 0,
      totalBonusEarned: bonusAgg._sum.amount ?? 0,
    };
  }

  /**
   * Full wallet ledger (newest first) from WalletTransaction.
   */
  async getTransactions(workerId: string, skip = 0, take = 50) {
    const worker = await this.prisma.workerProfile.findUnique({
      where: { id: workerId },
      select: { id: true },
    });
    if (!worker) {
      throw new NotFoundException(`Worker with ID ${workerId} not found`);
    }

    const [data, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where: { workerId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.walletTransaction.count({ where: { workerId } }),
    ]);

    return { data, total };
  }
}
