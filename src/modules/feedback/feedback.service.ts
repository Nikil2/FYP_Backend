import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { BookingStatus } from '@prisma/client';

@Injectable()
export class FeedbackService {
  constructor(
    private prisma: PrismaService,
    private realtimeGateway: RealtimeGateway,
  ) {}

  /**
   * Submit feedback (rating + optional comment) for a completed booking.
   * - Only the customer can leave feedback.
   * - Only for COMPLETED bookings.
   * - One feedback per booking (unique constraint).
   * - Auto-updates worker's averageRating.
   */
  async submitFeedback(userId: string, dto: CreateFeedbackDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: {
        worker: { select: { id: true, userId: true } },
        feedback: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${dto.bookingId} not found`);
    }

    // Only the customer who made the booking can leave feedback
    if (booking.customerId !== userId) {
      throw new ForbiddenException(
        'Only the customer can leave feedback for this booking',
      );
    }

    // Only completed bookings can receive feedback
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException(
        'Feedback can only be submitted for completed bookings',
      );
    }

    // Check if feedback already exists
    if (booking.feedback) {
      throw new ConflictException(
        'Feedback has already been submitted for this booking',
      );
    }

    // Create feedback and update worker's average rating in a transaction
    const feedback = await this.prisma.$transaction(async (tx) => {
      // Create the feedback
      const created = await tx.feedback.create({
        data: {
          bookingId: dto.bookingId,
          userId,
          rating: dto.rating,
          comment: dto.comment,
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              profilePicUrl: true,
            },
          },
          booking: {
            select: {
              id: true,
              workerId: true,
            },
          },
        },
      });

      // Recalculate worker's average rating
      const ratingResult = await tx.feedback.aggregate({
        where: {
          booking: { workerId: booking.worker.id },
        },
        _avg: { rating: true },
        _count: { rating: true },
      });

      // Update worker profile with new average
      await tx.workerProfile.update({
        where: { id: booking.worker.id },
        data: {
          averageRating: ratingResult._avg.rating || 0,
          totalJobsCompleted: { increment: 0 }, // Just update rating, not jobs count
        },
      });

      return created;
    });

    // Notify the worker about the new review in real-time
    this.realtimeGateway.emitNotification(booking.worker.userId, {
      type: 'NEW_REVIEW',
      title: 'New Review',
      body: `You received a ${dto.rating}-star review`,
      data: { bookingId: dto.bookingId, rating: dto.rating },
    });

    return feedback;
  }

  /**
   * Get all reviews for a specific worker (paginated).
   */
  async getWorkerReviews(
    workerId: string,
    skip: number = 0,
    take: number = 10,
  ) {
    const [reviews, total] = await Promise.all([
      this.prisma.feedback.findMany({
        where: {
          booking: { workerId },
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              profilePicUrl: true,
            },
          },
          booking: {
            select: {
              id: true,
              description: true,
              service: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.feedback.count({
        where: { booking: { workerId } },
      }),
    ]);

    return { data: reviews, total };
  }

  /**
   * Get rating statistics breakdown for a worker.
   */
  async getWorkerStats(workerId: string) {
    // Get overall stats
    const overall = await this.prisma.feedback.aggregate({
      where: { booking: { workerId } },
      _avg: { rating: true },
      _count: { rating: true },
    });

    // Get breakdown by rating (1-5)
    const breakdown = await this.prisma.feedback.groupBy({
      by: ['rating'],
      where: { booking: { workerId } },
      _count: { rating: true },
    });

    // Build the rating breakdown object
    const ratingBreakdown: Record<number, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    breakdown.forEach((b) => {
      ratingBreakdown[b.rating] = b._count.rating;
    });

    return {
      workerId,
      averageRating: overall._avg.rating || 0,
      totalReviews: overall._count.rating,
      ratingBreakdown,
    };
  }

  /**
   * Get feedback for a specific booking.
   */
  async getBookingFeedback(bookingId: string) {
    const feedback = await this.prisma.feedback.findUnique({
      where: { bookingId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            profilePicUrl: true,
          },
        },
      },
    });

    if (!feedback) {
      throw new NotFoundException(`No feedback found for booking ${bookingId}`);
    }

    return feedback;
  }
}
