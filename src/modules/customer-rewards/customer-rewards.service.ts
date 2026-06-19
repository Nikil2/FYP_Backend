import { Injectable, NotFoundException } from '@nestjs/common';
import { CustomerPointTxnType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const POINTS_EARN_BOOKING = 10;
const POINTS_EARN_COMPLETION = 20;
const POINTS_EARN_REVIEW = 5;
const POINTS_EARN_REFERRAL = 50;

@Injectable()
export class CustomerRewardsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Central ledger writer — every point movement goes through here.
   * Pass a transaction client when called inside a larger $transaction.
   */
  async awardPoints(
    customerId: string,
    type: CustomerPointTxnType,
    points: number,
    description: string,
    bookingId?: string,
    tx?: Prisma.TransactionClient,
  ) {
    const run = async (client: Prisma.TransactionClient) => {
      const user = await client.user.update({
        where: { id: customerId },
        data: {
          rewardPoints: { increment: points },
          totalPointsEarned: { increment: points },
        },
        select: { rewardPoints: true },
      });

      await client.customerPointTransaction.create({
        data: {
          customerId,
          type,
          points,
          balanceAfter: user.rewardPoints,
          bookingId,
          description,
        },
      });

      return user.rewardPoints;
    };

    return tx ? run(tx) : this.prisma.$transaction(run);
  }

  /**
   * Points summary + spending breakdown for a customer.
   */
  async getSummary(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        rewardPoints: true,
        totalPointsEarned: true,
        referralCode: true,
        referrals: { select: { id: true } },
      },
    });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalAgg, monthAgg, categoryBreakdown] = await Promise.all([
      this.prisma.booking.aggregate({
        where: { customerId: userId, status: 'COMPLETED' },
        _sum: { finalPrice: true },
        _count: { id: true },
      }),
      this.prisma.booking.aggregate({
        where: {
          customerId: userId,
          status: 'COMPLETED',
          completedAt: { gte: monthStart },
        },
        _sum: { finalPrice: true },
      }),
      this.prisma.booking.findMany({
        where: { customerId: userId, status: 'COMPLETED' },
        select: {
          finalPrice: true,
          service: { select: { name: true, categoryName: true } },
        },
      }),
    ]);

    // Build category spending map
    const byCategory: Record<string, number> = {};
    for (const b of categoryBreakdown) {
      const cat = b.service?.categoryName ?? 'Other';
      byCategory[cat] = (byCategory[cat] ?? 0) + Number(b.finalPrice ?? 0);
    }

    return {
      rewardPoints: user.rewardPoints,
      totalPointsEarned: user.totalPointsEarned,
      referralCode: user.referralCode,
      totalReferrals: user.referrals.length,
      totalSpent: totalAgg._sum.finalPrice ?? 0,
      totalBookings: totalAgg._count.id,
      thisMonthSpent: monthAgg._sum.finalPrice ?? 0,
      spendingByCategory: byCategory,
    };
  }

  /**
   * Full points transaction history for a customer (newest first).
   */
  async getTransactions(userId: string, skip = 0, take = 50) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    const [data, total] = await Promise.all([
      this.prisma.customerPointTransaction.findMany({
        where: { customerId: userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.customerPointTransaction.count({ where: { customerId: userId } }),
    ]);

    return { data, total };
  }

  /**
   * Called when a booking is created — +10 pts.
   */
  async onBookingCreated(customerId: string, bookingId: string, tx?: Prisma.TransactionClient) {
    return this.awardPoints(
      customerId,
      CustomerPointTxnType.EARN_BOOKING,
      POINTS_EARN_BOOKING,
      'Points for placing a booking',
      bookingId,
      tx,
    );
  }

  /**
   * Called when a booking is confirmed complete — +20 pts + optional referral bonus.
   */
  async onBookingCompleted(
    customerId: string,
    bookingId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const run = async (client: Prisma.TransactionClient) => {
      await this.awardPoints(
        customerId,
        CustomerPointTxnType.EARN_COMPLETION,
        POINTS_EARN_COMPLETION,
        'Points for completing a job',
        bookingId,
        client,
      );

      // If this is the customer's first completed booking AND they were referred,
      // award referral bonus to the referrer.
      const user = await client.user.findUnique({
        where: { id: customerId },
        select: { referredById: true },
      });

      if (user?.referredById) {
        const completedCount = await client.booking.count({
          where: { customerId, status: 'COMPLETED' },
        });
        if (completedCount === 1) {
          await this.awardPoints(
            user.referredById,
            CustomerPointTxnType.EARN_REFERRAL,
            POINTS_EARN_REFERRAL,
            'Referral bonus — your friend completed their first job',
            bookingId,
            client,
          );

          await this.notificationsService.createNotification(
            user.referredById,
            'Referral Bonus!',
            `You earned ${POINTS_EARN_REFERRAL} points because your friend completed their first booking.`,
            'REWARD',
          );
        }
      }
    };

    return tx ? run(tx) : this.prisma.$transaction(run);
  }

  /**
   * Called when a review is submitted — +5 pts.
   */
  async onReviewSubmitted(customerId: string, bookingId: string, tx?: Prisma.TransactionClient) {
    return this.awardPoints(
      customerId,
      CustomerPointTxnType.EARN_REVIEW,
      POINTS_EARN_REVIEW,
      'Points for leaving a review',
      bookingId,
      tx,
    );
  }
}
