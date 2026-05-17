import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto, CreatePriceProposalDto, UpdateBookingStatusDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('bookings')
@UseGuards(JwtAuthGuard) // All booking endpoints require authentication
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  /**
   * POST /bookings
   * Create a new booking (customers only)
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.CUSTOMER)
  async createBooking(
    @CurrentUser('sub') userId: string,
    @Body() createBookingDto: CreateBookingDto,
  ) {
    // Override customerId with authenticated user's ID
    createBookingDto.customerId = userId;
    return this.bookingsService.createBooking(createBookingDto);
  }

  /**
   * GET /bookings
   * Get all bookings — admin only
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAllBookings(
    @Query('skip') skip: string = '0',
    @Query('take') take: string = '20',
    @Query('status') status?: string,
  ) {
    return this.bookingsService.getAllBookings(parseInt(skip), parseInt(take), status);
  }

  /**
   * GET /bookings/my
   * Get current user's bookings (customer or worker)
   */
  @Get('my')
  async getMyBookings(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Query('skip') skip: string = '0',
    @Query('take') take: string = '20',
    @Query('status') status?: string,
  ) {
    if (user.role === UserRole.CUSTOMER) {
      return this.bookingsService.getCustomerBookings(user.sub, parseInt(skip), parseInt(take), status);
    } else {
      // For workers, we need the worker profile ID, not user ID
      return this.bookingsService.getWorkerBookingsByUserId(user.sub, parseInt(skip), parseInt(take), status);
    }
  }

  /**
   * GET /bookings/customer/:customerId
   * Get bookings for one customer
   */
  @Get('customer/:customerId')
  async getCustomerBookings(
    @Param('customerId') customerId: string,
    @Query('skip') skip: string = '0',
    @Query('take') take: string = '20',
    @Query('status') status?: string,
  ) {
    return this.bookingsService.getCustomerBookings(customerId, parseInt(skip), parseInt(take), status);
  }

  /**
   * GET /bookings/worker/:workerId
   * Get bookings for one worker
   */
  @Get('worker/:workerId')
  async getWorkerBookings(
    @Param('workerId') workerId: string,
    @Query('skip') skip: string = '0',
    @Query('take') take: string = '20',
    @Query('status') status?: string,
  ) {
    return this.bookingsService.getWorkerBookings(workerId, parseInt(skip), parseInt(take), status);
  }

  /**
   * GET /bookings/:id
   * Get booking by ID
   */
  @Get(':id')
  async getBookingById(@Param('id') bookingId: string) {
    return this.bookingsService.getBookingById(bookingId);
  }

  /**
   * PATCH /bookings/:id/status
   * Update booking status
   */
  @Patch(':id/status')
  async updateBookingStatus(
    @Param('id') bookingId: string,
    @Body() body: UpdateBookingStatusDto,
  ) {
    return this.bookingsService.updateBookingStatus(bookingId, body.status);
  }

  /**
   * POST /bookings/:id/cancel
   * Cancel booking
   */
  @Post(':id/cancel')
  async cancelBooking(@Param('id') bookingId: string) {
    return this.bookingsService.cancelBooking(bookingId);
  }

  /**
   * POST /bookings/:id/proposals
   * Create new price proposal for booking
   */
  @Post(':id/proposals')
  async createPriceProposal(
    @Param('id') bookingId: string,
    @CurrentUser('sub') userId: string,
    @Body() createPriceProposalDto: CreatePriceProposalDto,
  ) {
    // Override proposedBy with authenticated user's ID
    createPriceProposalDto.proposedBy = userId;
    return this.bookingsService.createPriceProposal(bookingId, createPriceProposalDto);
  }

  /**
   * POST /bookings/:id/proposals/:proposalId/accept
   * Accept price proposal
   */
  @Post(':id/proposals/:proposalId/accept')
  async acceptPriceProposal(
    @Param('id') bookingId: string,
    @Param('proposalId') proposalId: string,
  ) {
    return this.bookingsService.acceptPriceProposal(bookingId, proposalId);
  }
}
