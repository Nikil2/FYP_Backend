import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ComplaintsService } from './complaints.service';
import {
  CreateComplaintDto,
  ResolveComplaintDto,
} from './dto/create-complaint.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('complaints')
@UseGuards(JwtAuthGuard)
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  /**
   * POST /complaints
   * File a new complaint (customer or worker)
   */
  @Post()
  async fileComplaint(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateComplaintDto,
  ) {
    return this.complaintsService.fileComplaint(userId, dto);
  }

  /**
   * GET /complaints
   * Get all complaints — admin only
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAllComplaints(
    @Query('skip') skip: string = '0',
    @Query('take') take: string = '20',
    @Query('resolved') resolved?: string,
  ) {
    const isResolved =
      resolved === 'true' ? true : resolved === 'false' ? false : undefined;
    return this.complaintsService.getAllComplaints(
      parseInt(skip),
      parseInt(take),
      isResolved,
    );
  }

  /**
   * GET /complaints/booking/:bookingId
   * Get complaints for a booking
   */
  @Get('booking/:bookingId')
  async getBookingComplaints(@Param('bookingId') bookingId: string) {
    return this.complaintsService.getBookingComplaints(bookingId);
  }

  /**
   * GET /complaints/:id
   * Get complaint details
   */
  @Get(':id')
  async getComplaintById(@Param('id') complaintId: string) {
    return this.complaintsService.getComplaintById(complaintId);
  }

  /**
   * PUT /complaints/:id/resolve
   * Resolve a complaint — admin only
   */
  @Put(':id/resolve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async resolveComplaint(
    @CurrentUser('sub') adminUserId: string,
    @Param('id') complaintId: string,
    @Body() dto: ResolveComplaintDto,
  ) {
    return this.complaintsService.resolveComplaint(
      adminUserId,
      complaintId,
      dto,
    );
  }
}
