import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../prisma/prisma.service';
import { MessageType } from '@prisma/client';

/**
 * Shared WebSocket Gateway
 *
 * Handles all real-time communication for the platform:
 * - Message delivery (per-booking rooms)
 * - Notification push (per-user rooms)
 * - Typing indicators
 * - Online status
 *
 * Room naming convention:
 *   booking:{bookingId}  — for booking-specific messages
 *   user:{userId}        — for user-specific notifications
 */
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/',
})
@Injectable()
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  // Track connected users: userId -> Set<socketId>
  private userSockets = new Map<string, Set<string>>();
  // Track socket to user: socketId -> userId
  private socketUsers = new Map<string, string>();
  // Throttle DB writes for live location: bookingId -> last persisted timestamp
  private lastLocationWrite = new Map<string, number>();

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  /**
   * Handle new WebSocket connection.
   * Authenticates via JWT token in handshake auth or query.
   */
  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        (client.handshake.query?.token as string);

      if (!token) {
        this.logger.warn(
          `Client ${client.id} connected without token — disconnecting`,
        );
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret:
          process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      });

      const userId = payload.sub;

      // Check user exists and is not blocked
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, isBlocked: true, fullName: true, role: true },
      });

      if (!user || user.isBlocked) {
        this.logger.warn(`Client ${client.id} — invalid user or blocked`);
        client.disconnect();
        return;
      }

      // Store socket mapping
      this.socketUsers.set(client.id, userId);
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId).add(client.id);

      // Auto-join user's personal notification room
      client.join(`user:${userId}`);

      // Attach user info to socket for later use
      client.data.userId = userId;
      client.data.role = payload.role;
      client.data.fullName = user.fullName;

      this.logger.log(
        `✅ User ${user.fullName} (${userId}) connected — socket ${client.id}`,
      );
    } catch (error: any) {
      this.logger.warn(`Client ${client.id} — auth failed: ${error?.message}`);
      client.disconnect();
    }
  }

  /**
   * Handle WebSocket disconnection.
   */
  handleDisconnect(client: Socket) {
    const userId = this.socketUsers.get(client.id);
    if (userId) {
      this.userSockets.get(userId)?.delete(client.id);
      if (this.userSockets.get(userId)?.size === 0) {
        this.userSockets.delete(userId);
      }
      this.socketUsers.delete(client.id);
      this.logger.log(`❌ User ${userId} disconnected — socket ${client.id}`);
    }
  }

  // ==================== BOOKING ROOMS ====================

  /**
   * Join a booking chat room.
   * Client emits: 'join_booking' { bookingId: string }
   */
  @SubscribeMessage('join_booking')
  async handleJoinBooking(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { bookingId: string },
  ) {
    const userId = client.data.userId;
    if (!userId || !data.bookingId) return;

    // Verify user is a participant
    const booking = await this.prisma.booking.findUnique({
      where: { id: data.bookingId },
      include: { worker: { select: { userId: true } } },
    });

    if (!booking) return;

    const isParticipant =
      booking.customerId === userId || booking.worker.userId === userId;

    if (!isParticipant) {
      client.emit('error', { message: 'Not a participant of this booking' });
      return;
    }

    client.join(`booking:${data.bookingId}`);
    this.logger.log(`User ${userId} joined booking room: ${data.bookingId}`);

    client.emit('joined_booking', { bookingId: data.bookingId });
  }

  /**
   * Leave a booking chat room.
   * Client emits: 'leave_booking' { bookingId: string }
   */
  @SubscribeMessage('leave_booking')
  handleLeaveBooking(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { bookingId: string },
  ) {
    if (data.bookingId) {
      client.leave(`booking:${data.bookingId}`);
    }
  }

  // ==================== LIVE LOCATION ====================

  /**
   * Worker broadcasts their live position during an active booking.
   * Client emits: 'update_location' { bookingId, lat, lng, heading?, speed? }
   *
   * Only the assigned worker may emit, and only while the booking is ACCEPTED
   * or IN_PROGRESS. Position is broadcast to the booking room on every tick but
   * persisted at most once every LOCATION_WRITE_INTERVAL_MS, so a 5-second GPS
   * cadence doesn't become a 5-second write cadence.
   */
  @SubscribeMessage('update_location')
  async handleUpdateLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      bookingId: string;
      lat: number;
      lng: number;
      heading?: number;
      speed?: number;
    },
  ) {
    const LOCATION_WRITE_INTERVAL_MS = 15_000;
    const userId = client.data.userId;

    if (!userId || !data?.bookingId) return;
    if (typeof data.lat !== 'number' || typeof data.lng !== 'number') return;
    if (data.lat < -90 || data.lat > 90 || data.lng < -180 || data.lng > 180) {
      return;
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: data.bookingId },
      include: { worker: { select: { id: true, userId: true } } },
    });

    if (!booking) return;

    // Only the assigned worker may broadcast their position.
    if (booking.worker.userId !== userId) {
      client.emit('error', {
        message: 'Only the assigned worker can share location',
      });
      return;
    }

    // Only while the job is actually live.
    if (booking.status !== 'ACCEPTED' && booking.status !== 'IN_PROGRESS') {
      client.emit('tracking_stopped', { bookingId: data.bookingId });
      return;
    }

    const payload = {
      bookingId: data.bookingId,
      lat: data.lat,
      lng: data.lng,
      heading: data.heading ?? null,
      speed: data.speed ?? null,
      updatedAt: new Date().toISOString(),
    };

    // Broadcast to the customer immediately, every tick.
    client
      .to(`booking:${data.bookingId}`)
      .emit('worker_location_updated', payload);

    // Persist at a slower cadence.
    const now = Date.now();
    const lastWrite = this.lastLocationWrite.get(data.bookingId) ?? 0;
    if (now - lastWrite >= LOCATION_WRITE_INTERVAL_MS) {
      this.lastLocationWrite.set(data.bookingId, now);
      try {
        await this.prisma.workerProfile.update({
          where: { id: booking.worker.id },
          data: { liveLat: data.lat, liveLng: data.lng },
        });
      } catch (error: any) {
        this.logger.warn(
          `Failed to persist live location for booking ${data.bookingId}: ${error?.message}`,
        );
      }
    }
  }

  /**
   * Clear a booking's live-tracking state. Called when a booking reaches a
   * terminal status so stale coordinates aren't left behind.
   */
  async clearLiveLocation(bookingId: string, workerProfileId: string) {
    this.lastLocationWrite.delete(bookingId);
    this.server
      .to(`booking:${bookingId}`)
      .emit('tracking_stopped', { bookingId });

    try {
      await this.prisma.workerProfile.update({
        where: { id: workerProfileId },
        data: { liveLat: null, liveLng: null },
      });
    } catch (error: any) {
      this.logger.warn(`Failed to clear live location: ${error?.message}`);
    }
  }

  /**
   * Send a chat message via WebSocket.
   * Client emits: 'send_message' { bookingId: string, content: string }
   * Server saves to DB, emits 'new_message' to the booking room, sends notification.
   */
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { bookingId: string; content: string; type?: string },
  ) {
    const userId = client.data.userId;
    if (!userId || !data.bookingId || !data.content?.trim()) return;

    const booking = await this.prisma.booking.findUnique({
      where: { id: data.bookingId },
      include: { worker: { select: { userId: true } } },
    });

    if (!booking) return;

    const isCustomer = booking.customerId === userId;
    const isWorker = booking.worker.userId === userId;
    if (!isCustomer && !isWorker) return;

    const msgType =
      data.type === 'IMAGE' ? MessageType.IMAGE : MessageType.TEXT;

    const message = await this.prisma.message.create({
      data: {
        bookingId: data.bookingId,
        senderId: userId,
        content: data.content.trim(),
        type: msgType,
      },
      include: {
        sender: {
          select: { id: true, fullName: true, profilePicUrl: true, role: true },
        },
      },
    });

    // Send back to the sender directly (guaranteed delivery regardless of room join timing)
    client.emit('new_message', message);
    // Broadcast to all others in the room (worker / customer)
    client.to(`booking:${data.bookingId}`).emit('new_message', message);

    // Notify the recipient
    const recipientId = isCustomer ? booking.worker.userId : booking.customerId;
    const senderName = client.data.fullName || 'Someone';
    const preview =
      msgType === MessageType.IMAGE
        ? '📷 Sent an image'
        : data.content.trim().slice(0, 80);
    try {
      const notification = await this.prisma.notification.create({
        data: {
          userId: recipientId,
          title: `New message from ${senderName}`,
          body: preview,
          isRead: false,
        },
      });
      this.emitNotification(recipientId, notification);
    } catch (error: any) {
      this.logger.warn(`Failed to create chat notification: ${error?.message}`);
    }
  }

  /**
   * Typing indicator.
   * Client emits: 'typing_start' { bookingId: string }
   */
  @SubscribeMessage('typing_start')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { bookingId: string },
  ) {
    const userId = client.data.userId;
    if (userId && data.bookingId) {
      client.to(`booking:${data.bookingId}`).emit('user_typing', {
        userId,
        fullName: client.data.fullName,
        bookingId: data.bookingId,
      });
    }
  }

  /**
   * Stop typing indicator.
   * Client emits: 'typing_stop' { bookingId: string }
   */
  @SubscribeMessage('typing_stop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { bookingId: string },
  ) {
    const userId = client.data.userId;
    if (userId && data.bookingId) {
      client.to(`booking:${data.bookingId}`).emit('user_stopped_typing', {
        userId,
        bookingId: data.bookingId,
      });
    }
  }

  // ==================== SERVER-SIDE EMIT HELPERS ====================
  // These are called by services (Messages, Notifications) to push events

  /**
   * Emit a new message to all participants in a booking room.
   * Called by MessagesService after saving a message.
   */
  emitNewMessage(bookingId: string, message: any) {
    this.server.to(`booking:${bookingId}`).emit('new_message', message);
  }

  /**
   * Emit a notification to a specific user.
   * Called by NotificationsService after creating a notification.
   */
  emitNotification(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('new_notification', notification);
  }

  /**
   * Emit booking status update to all participants.
   */
  emitBookingStatusUpdate(bookingId: string, booking: any) {
    this.server
      .to(`booking:${bookingId}`)
      .emit('booking_status_updated', booking);
  }

  /**
   * Emit a new price proposal to booking participants.
   */
  emitPriceProposal(bookingId: string, proposal: any) {
    this.server.to(`booking:${bookingId}`).emit('new_proposal', proposal);
  }

  emitToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Check if a user is currently online (has connected sockets).
   */
  isUserOnline(userId: string): boolean {
    return (
      this.userSockets.has(userId) && this.userSockets.get(userId).size > 0
    );
  }

  /**
   * Get count of online users.
   */
  getOnlineUserCount(): number {
    return this.userSockets.size;
  }
}
