import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  ProposalStatus,
  VerificationStatus,
  WalletTxnType,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateBookingDto, CreatePriceProposalDto } from './dto';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { WalletService } from '../wallet/wallet.service';
import { BonusService, BonusEvaluationResult } from '../bonus/bonus.service';
import { CustomerRewardsService } from '../customer-rewards/customer-rewards.service';
import { CommissionService } from '../commission/commission.service';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private realtimeGateway: RealtimeGateway,
    private walletService: WalletService,
    private bonusService: BonusService,
    private customerRewardsService: CustomerRewardsService,
    private commissionService: CommissionService,
  ) {}

  async createBooking(createBookingDto: CreateBookingDto) {
    const {
      customerId,
      workerId,
      serviceId,
      description,
      jobAddress,
      jobLat,
      jobLng,
      scheduledAt,
      initialPrice,
      imageUrls,
    } = createBookingDto;

    if (jobLat < -90 || jobLat > 90 || jobLng < -180 || jobLng > 180) {
      throw new BadRequestException('Invalid coordinates provided');
    }

    const [customer, worker, service, workerService] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: customerId } }),
      this.prisma.workerProfile.findUnique({
        where: { id: workerId },
        include: { user: true },
      }),
      this.prisma.service.findUnique({ where: { id: serviceId } }),
      this.prisma.workerService.findUnique({
        where: { workerId_serviceId: { workerId, serviceId } },
      }),
    ]);

    if (!customer)
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    if (!worker)
      throw new NotFoundException(`Worker with ID ${workerId} not found`);
    if (!service)
      throw new NotFoundException(`Service with ID ${serviceId} not found`);

    if (worker.verificationStatus !== VerificationStatus.APPROVED) {
      throw new BadRequestException('Worker is not verified yet');
    }

    // Use provided initialPrice, or fall back to worker's set service price
    const effectivePrice =
      initialPrice && initialPrice > 0
        ? initialPrice
        : workerService?.price
        ? parseFloat(workerService.price.toString())
        : null;

    const booking = await this.prisma.$transaction(async (tx) => {
      const created = await tx.booking.create({
        data: {
          customerId,
          workerId,
          serviceId,
          description,
          jobAddress,
          jobLat,
          jobLng,
          imageUrls: imageUrls ?? [],
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
          status:
            effectivePrice && effectivePrice > 0
              ? BookingStatus.NEGOTIATION
              : BookingStatus.PENDING,
        },
        include: {
          customer: true,
          worker: { include: { user: true } },
          service: true,
        },
      });

      if (effectivePrice && effectivePrice > 0) {
        await tx.priceProposal.create({
          data: {
            bookingId: created.id,
            proposedBy: customerId,
            amount: effectivePrice.toString(),
            status: ProposalStatus.PENDING,
          },
        });
      }

      return created;
    });

    await this.notificationsService.createNotification(
      booking.worker.userId,
      'New Booking Request',
      `${booking.customer.fullName} requested ${booking.service.name}.`,
      'BOOKING_REQUEST',
    );

    // Award +10 points to customer for placing a booking
    await this.customerRewardsService.onBookingCreated(customerId, booking.id);

    return booking;
  }

  async getBookingById(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: true,
        worker: { include: { user: true } },
        service: true,
        proposals: { orderBy: { createdAt: 'asc' } },
        feedback: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found`);
    }

    return booking;
  }

  async getAllBookings(skip: number = 0, take: number = 20, status?: string) {
    const where = status ? { status: status as BookingStatus } : {};

    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: {
          customer: true,
          worker: { include: { user: true } },
          service: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return { data, total };
  }

  async getCustomerBookings(
    customerId: string,
    skip: number = 0,
    take: number = 20,
    status?: string,
  ) {
    const where = {
      customerId,
      ...(status ? { status: status as BookingStatus } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: {
          customer: true,
          worker: { include: { user: true } },
          service: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return { data, total };
  }

  async getWorkerBookingsByUserId(
    userId: string,
    skip: number = 0,
    take: number = 20,
    status?: string,
  ) {
    const workerProfile = await this.prisma.workerProfile.findUnique({
      where: { userId },
    });

    if (!workerProfile) {
      throw new NotFoundException(
        `Worker profile not found for user ${userId}`,
      );
    }

    return this.getWorkerBookings(workerProfile.id, skip, take, status);
  }

  async getWorkerBookings(
    workerId: string,
    skip: number = 0,
    take: number = 20,
    status?: string,
  ) {
    const where = {
      workerId,
      ...(status ? { status: status as BookingStatus } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: {
          customer: true,
          worker: { include: { user: true } },
          service: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return { data, total };
  }

  async updateBookingStatus(bookingId: string, nextStatus: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found`);
    }

    const allowedStatuses = Object.values(BookingStatus);
    if (!allowedStatuses.includes(nextStatus as BookingStatus)) {
      throw new BadRequestException('Invalid booking status');
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: nextStatus as BookingStatus },
      include: {
        customer: true,
        worker: { include: { user: true } },
        service: true,
      },
    });

    const statusLabel = nextStatus.replace('_', ' ').toLowerCase();
    await this.notificationsService.createNotification(
      updated.customer.id,
      'Booking Updated',
      `Your booking for ${updated.service.name} is now ${statusLabel}.`,
      'BOOKING_STATUS',
    );

    await this.notificationsService.createNotification(
      updated.worker.user.id,
      'Booking Status Updated',
      `Booking for ${updated.service.name} is now ${statusLabel}.`,
      'BOOKING_STATUS',
    );

    const statusPayload = { bookingId, status: nextStatus };
    this.realtimeGateway.emitToUser(updated.customer.id, 'booking_status_updated', statusPayload);
    this.realtimeGateway.emitToUser(updated.worker.user.id, 'booking_status_updated', statusPayload);

    return updated;
  }

  /**
   * Worker marks an in-progress job as done. Moves it to PENDING_CONFIRMATION —
   * the job does NOT count yet. The customer must confirm (anti-fraud, US-008).
   */
  async markJobDone(bookingId: string, workerUserId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        service: true,
        worker: { select: { userId: true } },
      },
    });
    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found`);
    }
    if (booking.worker.userId !== workerUserId) {
      throw new ForbiddenException('Only the assigned worker can mark this job done');
    }
    if (
      booking.status !== BookingStatus.IN_PROGRESS &&
      booking.status !== BookingStatus.ACCEPTED
    ) {
      throw new BadRequestException(
        'Only an accepted or in-progress job can be marked as done',
      );
    }

    return this.updateBookingStatus(
      bookingId,
      BookingStatus.PENDING_CONFIRMATION,
    );
  }

  /**
   * Customer confirms the job is complete. This is THE event that fires all stats:
   * marks COMPLETED, counts the job, and debits the platform commission from the
   * worker's wallet — atomically. (Bonus evaluation hooks in here in Part 3.)
   */
  async confirmCompletion(bookingId: string, customerUserId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: true,
        service: true,
        worker: { select: { id: true, userId: true } },
      },
    });
    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found`);
    }
    if (booking.customerId !== customerUserId) {
      throw new ForbiddenException(
        'Only the customer can confirm this booking',
      );
    }
    if (booking.status !== BookingStatus.PENDING_CONFIRMATION) {
      throw new BadRequestException(
        'Booking must be awaiting confirmation to be completed',
      );
    }

    // Commission rate from config (falls back to 10%).
    const config = await this.prisma.bonusConfig.findUnique({
      where: { id: 1 },
    });
    const rate = config ? Number(config.commissionRate) : 0.1;
    const finalPrice = booking.finalPrice ? Number(booking.finalPrice) : 0;
    const commission = Math.round(finalPrice * rate * 100) / 100;

    const bonusResult = await this.prisma.$transaction(async (tx) => {
      // 1. mark completed + stamp commission snapshot
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.COMPLETED,
          completedAt: new Date(),
          commissionRate: rate,
          commissionAmount: commission,
        },
      });

      // 2. count the job (the counter that was never incremented before)
      const updatedWorker = await tx.workerProfile.update({
        where: { id: booking.worker.id },
        data: { totalJobsCompleted: { increment: 1 } },
      });

      // 3. debit the platform commission from the worker's wallet (+ ledger row)
      if (commission > 0) {
        await this.walletService.adjust(
          {
            workerId: booking.worker.id,
            type: WalletTxnType.COMMISSION_DEBIT,
            amount: -commission,
            description: `Commission (${(rate * 100).toFixed(
              0,
            )}%) for ${booking.service.name}`,
            bookingId,
          },
          tx,
        );
      }

      // 4. start 15-day commission clock if not already running (after transaction commits)
      // We call this outside the tx to avoid blocking, but after debit is done.

      // 5. award customer completion points inside the same transaction
      await this.customerRewardsService.onBookingCompleted(booking.customerId, bookingId, tx);

      // 5. bonus engine — tier recompute + rolling-20 cashback, same transaction
      return this.bonusService.processCompletion(tx, updatedWorker);
    });

    // Start 15-day commission due-date clock if commission was charged
    if (commission > 0) {
      await this.commissionService.ensureDueDateSet(booking.worker.id);
    }

    await this.emitBonusNotifications(booking.worker.userId, bonusResult);

    // notify both sides + realtime
    await this.notificationsService.createNotification(
      booking.worker.userId,
      'Job Completed',
      `${booking.customer.fullName} confirmed completion of ${booking.service.name}.`,
      'BOOKING_STATUS',
    );
    await this.notificationsService.createNotification(
      booking.customerId,
      'Booking Completed',
      `Your booking for ${booking.service.name} is complete.`,
      'BOOKING_STATUS',
    );

    const payload = { bookingId, status: BookingStatus.COMPLETED };
    this.realtimeGateway.emitToUser(
      booking.customerId,
      'booking_status_updated',
      payload,
    );
    this.realtimeGateway.emitToUser(
      booking.worker.userId,
      'booking_status_updated',
      payload,
    );

    return this.getBookingById(bookingId);
  }

  /**
   * Fire tier-up / bonus-earned / milestone notifications after the completion
   * transaction commits (US-003, US-004, US-014).
   */
  private async emitBonusNotifications(
    workerUserId: string,
    result: BonusEvaluationResult,
  ) {
    if (result.bonusPaid && result.bonusAmount > 0) {
      await this.notificationsService.createNotification(
        workerUserId,
        '🎉 Bonus Earned!',
        `You earned Rs. ${result.bonusAmount} cashback for completing ${
          result.windowIndex! * 20
        } jobs.`,
        'BONUS_EARNED',
      );
    }

    if (result.tierChanged && result.newTier !== 'NONE') {
      await this.notificationsService.createNotification(
        workerUserId,
        '⭐ New Tier Unlocked',
        `Congratulations! You are now a ${result.newTier} worker.`,
        'TIER_UP',
      );
    }

    if (result.milestonePercent) {
      await this.notificationsService.createNotification(
        workerUserId,
        'Keep going!',
        `You're ${result.milestonePercent}% of the way to your next bonus.`,
        'BONUS_MILESTONE',
      );
    }
  }

  async cancelBooking(bookingId: string, cancelledByUserId?: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: true,
        service: true,
        worker: { select: { id: true, userId: true } },
      },
    });
    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found`);
    }

    if (
      booking.status === BookingStatus.IN_PROGRESS ||
      booking.status === BookingStatus.COMPLETED ||
      booking.status === BookingStatus.PENDING_CONFIRMATION
    ) {
      throw new BadRequestException(
        'Cannot cancel an in-progress, awaiting-confirmation, or completed booking',
      );
    }

    // Track worker-initiated cancellations (feeds completion/cancellation rate).
    if (cancelledByUserId && cancelledByUserId === booking.worker.userId) {
      await this.prisma.workerProfile.update({
        where: { id: booking.worker.id },
        data: { jobsCancelledByWorker: { increment: 1 } },
      });
    }

    return this.updateBookingStatus(bookingId, BookingStatus.CANCELLED);
  }

  async getProposals(bookingId: string) {
    return this.prisma.priceProposal.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createPriceProposal(bookingId: string, dto: CreatePriceProposalDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        service: true,
        worker: { select: { userId: true } },
      },
    });
    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found`);
    }

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.NEGOTIATION,
      },
    });

    const proposal = await this.prisma.priceProposal.create({
      data: {
        bookingId,
        proposedBy: dto.proposedBy,
        amount: dto.amount.toString(),
        status: ProposalStatus.PENDING,
      },
    });

    const recipientId =
      dto.proposedBy === booking.customerId
        ? booking.worker.userId
        : booking.customerId;

    await this.notificationsService.createNotification(
      recipientId,
      'New Price Proposal',
      `New proposal for ${booking.service.name}: Rs. ${dto.amount}.`,
      'PRICE_PROPOSAL',
    );

    const proposalPayload = { bookingId, ...proposal };
    this.realtimeGateway.emitToUser(booking.customerId, 'new_proposal', proposalPayload);
    this.realtimeGateway.emitToUser(booking.worker.userId, 'new_proposal', proposalPayload);

    return proposal;
  }

  async acceptPriceProposal(bookingId: string, proposalId: string) {
    const [booking, proposal] = await Promise.all([
      this.prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          customer: true,
          service: true,
          worker: { select: { userId: true } },
        },
      }),
      this.prisma.priceProposal.findUnique({ where: { id: proposalId } }),
    ]);

    if (!booking)
      throw new NotFoundException(`Booking with ID ${bookingId} not found`);
    if (!proposal || proposal.bookingId !== bookingId) {
      throw new NotFoundException(
        `Proposal with ID ${proposalId} not found for this booking`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.priceProposal.updateMany({
        where: { bookingId, status: ProposalStatus.PENDING },
        data: { status: ProposalStatus.REJECTED },
      });

      await tx.priceProposal.update({
        where: { id: proposalId },
        data: { status: ProposalStatus.ACCEPTED },
      });

      await tx.booking.update({
        where: { id: bookingId },
        data: {
          finalPrice: proposal.amount,
          status: BookingStatus.ACCEPTED,
        },
      });
    });

    await this.notificationsService.createNotification(
      booking.customerId,
      'Price Proposal Accepted',
      `Proposal accepted for ${booking.service.name}.`,
      'PRICE_PROPOSAL',
    );

    await this.notificationsService.createNotification(
      booking.worker.userId,
      'Price Proposal Accepted',
      `Proposal accepted for ${booking.service.name}.`,
      'PRICE_PROPOSAL',
    );

    const acceptedPayload = { bookingId, status: 'ACCEPTED', finalPrice: proposal.amount };
    this.realtimeGateway.emitToUser(booking.customerId, 'booking_status_updated', acceptedPayload);
    this.realtimeGateway.emitToUser(booking.worker.userId, 'booking_status_updated', acceptedPayload);

    return this.getBookingById(bookingId);
  }
}
