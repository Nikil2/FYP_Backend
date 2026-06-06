import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateComplaintDto,
  ResolveComplaintDto,
} from './dto/create-complaint.dto';
import { BookingStatus } from '@prisma/client';

@Injectable()
export class ComplaintsService {
  constructor(
    private prisma: PrismaService,
    private realtimeGateway: RealtimeGateway,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * File a complaint for a booking.
   * - Either customer or worker can file.
   * - Only for ACCEPTED, IN_PROGRESS, or COMPLETED bookings.
   * - Automatically sets booking status to DISPUTED.
   */
  async fileComplaint(userId: string, dto: CreateComplaintDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: {
        worker: { select: { id: true, userId: true } },
        customer: { select: { id: true } },
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${dto.bookingId} not found`);
    }

    // Verify complainant is a participant
    const isCustomer = booking.customerId === userId;
    const isWorker = booking.worker.userId === userId;

    if (!isCustomer && !isWorker) {
      throw new ForbiddenException('You are not a participant of this booking');
    }

    // Only allow complaints on valid statuses
    const allowedStatuses: BookingStatus[] = [
      BookingStatus.ACCEPTED,
      BookingStatus.IN_PROGRESS,
      BookingStatus.COMPLETED,
    ];
    if (!allowedStatuses.includes(booking.status as BookingStatus)) {
      throw new BadRequestException(
        `Complaints can only be filed for bookings with status: ${allowedStatuses.join(', ')}`,
      );
    }

    // Create complaint and update booking status in transaction
    const complaint = await this.prisma.$transaction(async (tx) => {
      const created = await tx.complaint.create({
        data: {
          bookingId: dto.bookingId,
          description: dto.description,
          evidenceUrls: dto.evidenceUrls || [],
        },
        include: {
          booking: {
            select: {
              id: true,
              customerId: true,
              worker: { select: { userId: true } },
              service: { select: { name: true } },
            },
          },
        },
      });

      // Set booking to DISPUTED
      await tx.booking.update({
        where: { id: dto.bookingId },
        data: { status: BookingStatus.DISPUTED },
      });

      return created;
    });

    // Notify the other party and admins in real-time
    const otherPartyUserId = isCustomer
      ? booking.worker.userId
      : booking.customerId;
    await this.notificationsService.createNotification(
      otherPartyUserId,
      'Complaint Filed',
      'A complaint has been filed for your booking',
      'COMPLAINT_FILED',
    );

    // Notify booking room about status change
    this.realtimeGateway.emitBookingStatusUpdate(dto.bookingId, {
      bookingId: dto.bookingId,
      status: BookingStatus.DISPUTED,
    });

    return complaint;
  }

  /**
   * Get complaints for a specific booking.
   */
  async getBookingComplaints(bookingId: string) {
    const complaints = await this.prisma.complaint.findMany({
      where: { bookingId },
      include: {
        admin: {
          include: {
            user: { select: { fullName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return complaints;
  }

  /**
   * Get a single complaint by ID.
   */
  async getComplaintById(complaintId: string) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id: complaintId },
      include: {
        booking: {
          include: {
            customer: {
              select: { id: true, fullName: true, phoneNumber: true },
            },
            worker: {
              include: {
                user: {
                  select: { id: true, fullName: true, phoneNumber: true },
                },
              },
            },
            service: true,
          },
        },
        admin: {
          include: {
            user: { select: { fullName: true } },
          },
        },
      },
    });

    if (!complaint) {
      throw new NotFoundException(`Complaint with ID ${complaintId} not found`);
    }

    return complaint;
  }

  /**
   * Get all complaints (admin) with pagination and status filter.
   */
  async getAllComplaints(
    skip: number = 0,
    take: number = 20,
    isResolved?: boolean,
  ) {
    const where = isResolved !== undefined ? { isResolved } : {};

    const [complaints, total] = await Promise.all([
      this.prisma.complaint.findMany({
        where,
        include: {
          booking: {
            select: {
              id: true,
              customer: { select: { fullName: true } },
              worker: {
                select: { user: { select: { fullName: true } } },
              },
              service: { select: { name: true } },
              status: true,
            },
          },
          admin: {
            include: {
              user: { select: { fullName: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.complaint.count({ where }),
    ]);

    return { data: complaints, total };
  }

  /**
   * Resolve a complaint (admin only).
   */
  async resolveComplaint(
    adminUserId: string,
    complaintId: string,
    dto: ResolveComplaintDto,
  ) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id: complaintId },
      include: {
        booking: {
          include: {
            worker: { select: { userId: true } },
          },
        },
      },
    });

    if (!complaint) {
      throw new NotFoundException(`Complaint with ID ${complaintId} not found`);
    }

    if (complaint.isResolved) {
      throw new BadRequestException('Complaint is already resolved');
    }

    // Find or create admin profile
    let adminProfile = await this.prisma.adminProfile.findUnique({
      where: { userId: adminUserId },
    });

    if (!adminProfile) {
      adminProfile = await this.prisma.adminProfile.create({
        data: { userId: adminUserId },
      });
    }

    // Resolve the complaint
    const resolved = await this.prisma.complaint.update({
      where: { id: complaintId },
      data: {
        isResolved: true,
        adminId: adminProfile.id,
      },
      include: {
        booking: {
          select: {
            id: true,
            customerId: true,
            worker: { select: { userId: true } },
          },
        },
      },
    });

    // Notify both parties in real-time
    await Promise.all([
      this.notificationsService.createNotification(
        resolved.booking.customerId,
        'Complaint Resolved',
        dto.resolution,
        'COMPLAINT_RESOLVED',
      ),
      this.notificationsService.createNotification(
        resolved.booking.worker.userId,
        'Complaint Resolved',
        'A complaint on your booking has been resolved',
        'COMPLAINT_RESOLVED',
      ),
    ]);

    return resolved;
  }
}
