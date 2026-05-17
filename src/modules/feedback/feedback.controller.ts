import { Controller, Post, Get, Param, Body, Query, UseGuards } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  /**
   * POST /feedback
   * Submit feedback for a completed booking (customers only)
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  async submitFeedback(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateFeedbackDto,
  ) {
    return this.feedbackService.submitFeedback(userId, dto);
  }

  /**
   * GET /feedback/worker/:workerId
   * Get all reviews for a worker (public)
   */
  @Get('worker/:workerId')
  async getWorkerReviews(
    @Param('workerId') workerId: string,
    @Query('skip') skip: string = '0',
    @Query('take') take: string = '10',
  ) {
    return this.feedbackService.getWorkerReviews(workerId, parseInt(skip), parseInt(take));
  }

  /**
   * GET /feedback/worker/:workerId/stats
   * Get worker rating statistics (public)
   */
  @Get('worker/:workerId/stats')
  async getWorkerStats(@Param('workerId') workerId: string) {
    return this.feedbackService.getWorkerStats(workerId);
  }

  /**
   * GET /feedback/booking/:bookingId
   * Get feedback for a specific booking
   */
  @Get('booking/:bookingId')
  @UseGuards(JwtAuthGuard)
  async getBookingFeedback(@Param('bookingId') bookingId: string) {
    return this.feedbackService.getBookingFeedback(bookingId);
  }
}
