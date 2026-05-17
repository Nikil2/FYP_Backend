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
    } catch (error) {
      this.logger.warn(`Client ${client.id} — auth failed: ${error.message}`);
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
