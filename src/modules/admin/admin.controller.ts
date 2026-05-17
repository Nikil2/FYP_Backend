import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminLoginDto, AdminResponseDto, DashboardResponseDto, UpdateServiceDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ==================== PUBLIC (Admin Login) ====================

  /**
   * Admin Login
   * POST /admin/login
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: AdminLoginDto): Promise<{ data: AdminResponseDto; message: string }> {
    const admin = await this.adminService.validateAdminCredentials(
      loginDto.username,
      loginDto.password,
    );
    return {
      data: admin,
      message: 'Admin login successful',
    };
  }

  // ==================== ALL BELOW REQUIRE ADMIN AUTH ====================

  /**
   * Get Dashboard Statistics
   * GET /admin/dashboard
   */
  @Get('dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getDashboard(): Promise<{ data: DashboardResponseDto }> {
    const dashboard = await this.adminService.getDashboardStats();
    return { data: dashboard };
  }

  // ==================== USER MANAGEMENT ====================

  /**
   * Get all users with filtering and pagination
   * GET /admin/users?page=1&limit=10&search=&role=&status=
   */
  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getUsers(
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getAllUsers(page, limit, search, role, status);
  }

  /**
   * Block a user
   * POST /admin/users/:id/block
   */
  @Post('users/:id/block')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async blockUser(@Param('id') userId: string) {
    const user = await this.adminService.toggleUserBlock(userId, true);
    return {
      data: user,
      message: 'User blocked successfully',
    };
  }

  /**
   * Unblock a user
   * POST /admin/users/:id/unblock
   */
  @Post('users/:id/unblock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async unblockUser(@Param('id') userId: string) {
    const user = await this.adminService.toggleUserBlock(userId, false);
    return {
      data: user,
      message: 'User unblocked successfully',
    };
  }

  /**
   * Delete a user
   * DELETE /admin/users/:id
   */
  @Delete('users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async deleteUser(@Param('id') userId: string) {
    await this.adminService.deleteUser(userId);
    return {
      message: 'User deleted successfully',
    };
  }

  // ==================== WORKER MANAGEMENT ====================

  /**
   * Get all workers with filtering
   * GET /admin/workers?page=1&limit=10&search=&status=
   */
  @Get('workers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getWorkers(
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getAllWorkers(page, limit, search, status);
  }

  /**
   * Get pending worker verifications
   * GET /admin/workers/verification
   */
  @Get('workers/verification')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getPendingVerifications() {
    const workers = await this.adminService.getPendingVerifications();
    return {
      data: workers,
      total: workers.length,
    };
  }

  /**
   * Approve worker verification
   * POST /admin/workers/:id/approve
   */
  @Post('workers/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async approveWorker(
    @Param('id') workerId: string,
    @CurrentUser('sub') adminUserId: string,
  ) {
    const worker = await this.adminService.approveWorkerVerification(workerId, adminUserId);
    return {
      data: worker,
      message: 'Worker verification approved',
    };
  }

  /**
   * Reject worker verification
   * POST /admin/workers/:id/reject
   */
  @Post('workers/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async rejectWorker(
    @Param('id') workerId: string,
    @Body('reason') reason: string = 'Verification rejected',
    @CurrentUser('sub') adminUserId: string,
  ) {
    const worker = await this.adminService.rejectWorkerVerification(workerId, adminUserId, reason);
    return {
      data: worker,
      message: 'Worker verification rejected',
    };
  }

  // ==================== JOBS / BOOKINGS ====================

  /**
   * Get jobs/bookings with filtering and pagination.
   * GET /admin/jobs?page=1&limit=20&status=ACTIVE&search=
   */
  @Get('jobs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getJobs(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const parsedPage = Number(page) > 0 ? Number(page) : 1;
    const parsedLimit = Number(limit) > 0 ? Number(limit) : 20;

    return this.adminService.getJobs(parsedPage, parsedLimit, status, search);
  }

  /**
   * Get one job/booking with end-to-end details.
   * GET /admin/jobs/:id
   */
  @Get('jobs/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getJobById(@Param('id') jobId: string) {
    const job = await this.adminService.getJobById(jobId);
    return {
      data: job,
    };
  }

  // ==================== COMPLAINT MANAGEMENT ====================

  /**
   * Get all complaints
   * GET /admin/complaints?page=1&limit=10&status=
   */
  @Get('complaints')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getComplaints(
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
    @Query('status') status?: string,
  ) {
    return this.adminService.getComplaints(page, limit, status);
  }

  /**
   * Resolve a complaint
   * POST /admin/complaints/:id/resolve
   */
  @Post('complaints/:id/resolve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async resolveComplaint(
    @Param('id') complaintId: string,
    @CurrentUser('sub') adminUserId: string,
  ) {
    const complaint = await this.adminService.resolveComplaint(complaintId, adminUserId);
    return {
      data: complaint,
      message: 'Complaint resolved successfully',
    };
  }

  /**
   * Assign complaint to admin
   * POST /admin/complaints/:id/assign
   */
  @Post('complaints/:id/assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async assignComplaint(
    @Param('id') complaintId: string,
    @Body('adminId') adminId: string,
  ) {
    const complaint = await this.adminService.assignComplaint(complaintId, adminId);
    return {
      data: complaint,
      message: 'Complaint assigned successfully',
    };
  }

  // ==================== REVIEW MODERATION ====================

  /**
   * Get all reviews
   * GET /admin/reviews?page=1&limit=10&filter=flagged&minRating=2
   */
  @Get('reviews')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getReviews(
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
    @Query('filter') filter?: string,
    @Query('minRating', ParseIntPipe) minRating?: number,
  ) {
    return this.adminService.getReviews(page, limit, filter, minRating);
  }

  /**
   * Hide a review
   * POST /admin/reviews/:id/hide
   */
  @Post('reviews/:id/hide')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async hideReview(@Param('id') reviewId: string) {
    await this.adminService.toggleReviewVisibility(reviewId, true);
    return {
      message: 'Review hidden successfully',
    };
  }

  // ==================== SERVICE MANAGEMENT ====================

  /**
   * Get all services
   * GET /admin/services
   */
  @Get('services')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getServices() {
    const services = await this.adminService.getAllServices();
    return {
      data: services,
      total: services.length,
    };
  }

  /**
   * Create a new service category
   * POST /admin/services
   */
  @Post('services')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createService(
    @Body('name') name: string,
    @Body('categoryId') categoryId: string,
    @Body('categoryName') categoryName: string,
    @Body('iconUrl') iconUrl?: string,
    @Body('categoryIcon') categoryIcon?: string,
  ) {
    const service = await this.adminService.createService(
      name,
      iconUrl,
      categoryId,
      categoryName,
      categoryIcon,
    );
    return {
      data: service,
      message: 'Service category created successfully',
    };
  }

  /**
   * Update a service category
   * PUT /admin/services/:id
   */
  @Put('services/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateService(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: UpdateServiceDto,
  ) {
    const service = await this.adminService.updateService(id, updateData);
    return {
      data: service,
      message: 'Service category updated successfully',
    };
  }

  /**
   * Deactivate a service category
   * POST /admin/services/:id/deactivate
   */
  @Post('services/:id/deactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async deactivateService(@Param('id', ParseIntPipe) id: number) {
    const service = await this.adminService.deactivateService(id);
    return {
      data: service,
      message: 'Service category deactivated',
    };
  }

  /**
   * Activate a service category
   * POST /admin/services/:id/activate
   */
  @Post('services/:id/activate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async activateService(@Param('id', ParseIntPipe) id: number) {
    const service = await this.adminService.activateService(id);
    return {
      data: service,
      message: 'Service category activated',
    };
  }

  // ==================== REVENUE & ANALYTICS ====================

  /**
   * Get revenue statistics
   * GET /admin/revenue
   */
  @Get('revenue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getRevenue() {
    const revenue = await this.adminService.getRevenueStats();
    return {
      data: revenue,
    };
  }

  /**
   * Get analytics data
   * GET /admin/analytics
   */
  @Get('analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAnalytics() {
    const analytics = await this.adminService.getAnalytics();
    return {
      data: analytics,
    };
  }
}
