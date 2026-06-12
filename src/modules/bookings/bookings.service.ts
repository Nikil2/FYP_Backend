import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  ProposalStatus,
  VerificationStatus,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateBookingDto, CreatePriceProposalDto } from './dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
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

    return booking;
  }

  async getBookingById(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: true,
        worker: {
          include: { user: true, services: { include: { service: true } } },
        },
        service: true,
        proposals: { orderBy: { createdAt: 'desc' } },
        messages: {
          include: { sender: true },
          orderBy: { createdAt: 'asc' },
        },
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

    return updated;
  }

  async cancelBooking(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: true,
        service: true,
        worker: { select: { userId: true } },
      },
    });
    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found`);
    }

    if (
      booking.status === BookingStatus.IN_PROGRESS ||
      booking.status === BookingStatus.COMPLETED
    ) {
      throw new BadRequestException(
        'Cannot cancel in-progress or completed booking',
      );
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

    return this.getBookingById(bookingId);
  }
}
