import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageType } from '@prisma/client';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private realtimeGateway: RealtimeGateway,
  ) {}

  /**
   * Send a message in a booking conversation.
   * Validates that the sender is a participant, saves to DB,
   * and emits via Socket.IO to the booking room in real-time.
   */
  async sendMessage(senderId: string, dto: CreateMessageDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: {
        worker: { select: { userId: true } },
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${dto.bookingId} not found`);
    }

    // Verify sender is a participant (customer or worker's user)
    const isCustomer = booking.customerId === senderId;
    const isWorker = booking.worker.userId === senderId;

    if (!isCustomer && !isWorker) {
      throw new ForbiddenException('You are not a participant of this booking');
    }

    // Save message to database
    const message = await this.prisma.message.create({
      data: {
        bookingId: dto.bookingId,
        senderId,
        content: dto.content,
        type: dto.type || MessageType.TEXT,
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            profilePicUrl: true,
            role: true,
          },
        },
      },
    });

    // Emit to booking room via Socket.IO (real-time delivery)
    this.realtimeGateway.emitNewMessage(dto.bookingId, message);

    return message;
  }

  /**
   * Get all messages for a booking (paginated, chronological).
   * Only booking participants can view messages.
   */
  async getBookingMessages(
    userId: string,
    bookingId: string,
    skip: number = 0,
    take: number = 50,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        worker: { select: { userId: true } },
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found`);
    }

    // Verify requester is a participant
    const isCustomer = booking.customerId === userId;
    const isWorker = booking.worker.userId === userId;

    if (!isCustomer && !isWorker) {
      throw new ForbiddenException('You are not a participant of this booking');
    }

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { bookingId },
        include: {
          sender: {
            select: {
              id: true,
              fullName: true,
              profilePicUrl: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take,
      }),
      this.prisma.message.count({ where: { bookingId } }),
    ]);

    return { data: messages, total };
  }

  /**
   * Get a single message by ID.
   */
  async getMessageById(messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            profilePicUrl: true,
            role: true,
          },
        },
      },
    });

    if (!message) {
      throw new NotFoundException(`Message with ID ${messageId} not found`);
    }

    return message;
  }
}
