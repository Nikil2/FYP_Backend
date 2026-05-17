import { Controller, Get, Put, Delete, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * GET /notifications
   * Get current user's notifications
   */
  @Get()
  async getMyNotifications(
    @CurrentUser('sub') userId: string,
    @Query('skip') skip: string = '0',
    @Query('take') take: string = '20',
  ) {
    return this.notificationsService.getUserNotifications(userId, parseInt(skip), parseInt(take));
  }

  /**
   * GET /notifications/unread
   * Get unread notification count
   */
  @Get('unread')
  async getUnreadCount(@CurrentUser('sub') userId: string) {
    return this.notificationsService.getUnreadCount(userId);
  }

  /**
   * PUT /notifications/:id/read
   * Mark a notification as read
   */
  @Put(':id/read')
  async markAsRead(
    @CurrentUser('sub') userId: string,
    @Param('id') notificationId: string,
  ) {
    return this.notificationsService.markAsRead(userId, notificationId);
  }

  /**
   * PUT /notifications/read-all
   * Mark all notifications as read
   */
  @Put('read-all')
  async markAllAsRead(@CurrentUser('sub') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  /**
   * DELETE /notifications/:id
   * Delete a notification
   */
  @Delete(':id')
  async deleteNotification(
    @CurrentUser('sub') userId: string,
    @Param('id') notificationId: string,
  ) {
    return this.notificationsService.deleteNotification(userId, notificationId);
  }

  /**
   * DELETE /notifications/all
   * Delete all notifications
   */
  @Delete('all')
  async deleteAllNotifications(@CurrentUser('sub') userId: string) {
    return this.notificationsService.deleteAllNotifications(userId);
  }

  /**
   * POST /notifications/fcm-token
   * Register FCM token for push notifications
   */
  @Post('fcm-token')
  async updateFcmToken(
    @CurrentUser('sub') userId: string,
    @Body('fcmToken') fcmToken: string,
  ) {
    return this.notificationsService.updateFcmToken(userId, fcmToken);
  }
}
