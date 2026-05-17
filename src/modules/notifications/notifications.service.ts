import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private realtimeGateway: RealtimeGateway,
  ) {}

  /**
   * Create a notification and push it via Socket.IO in real-time.
   * This is the central method called by other services to notify users.
   */
  async createNotification(userId: string, title: string, body: string, type?: string) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        title,
        body,
      },
    });

    // Push via Socket.IO immediately
    this.realtimeGateway.emitNotification(userId, {
      ...notification,
      type: type || 'GENERAL',
    });

    return notification;
  }

  /**
   * Get user's notifications (paginated, newest first).
   */
  async getUserNotifications(userId: string, skip: number = 0, take: number = 20) {
    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return { data: notifications, total };
  }

  /**
   * Get unread notification count for a user.
   */
  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { unreadCount: count };
  }

  /**
   * Mark a single notification as read.
   */
  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException(`Notification not found`);
    }

    if (notification.userId !== userId) {
      throw new NotFoundException(`Notification not found`);
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  /**
   * Mark all notifications as read for a user.
   */
  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return { message: 'All notifications marked as read' };
  }

  /**
   * Delete a notification.
   */
  async deleteNotification(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      throw new NotFoundException(`Notification not found`);
    }

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });

    return { message: 'Notification deleted' };
  }

  /**
   * Delete all notifications for a user.
   */
  async deleteAllNotifications(userId: string) {
    await this.prisma.notification.deleteMany({
      where: { userId },
    });

    return { message: 'All notifications deleted' };
  }

  /**
   * Update FCM token for push notifications.
   */
  async updateFcmToken(userId: string, fcmToken: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken },
    });

    return { message: 'FCM token updated' };
  }
}
