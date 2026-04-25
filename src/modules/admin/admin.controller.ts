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
  ParseBoolPipe,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminLoginDto, AdminResponseDto, DashboardResponseDto, UpdateServiceDto } from './dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

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

  /**
   * Get Dashboard Statistics
   * GET /admin/dashboard
   */
  @Get('dashboard')
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
  async approveWorker(@Param('id') workerId: string) {
    // In production, get adminId from JWT token
    const worker = await this.adminService.approveWorkerVerification(workerId, 'admin-user');
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
  async rejectWorker(
    @Param('id') workerId: string,
    @Body('reason') reason: string = 'Verification rejected',
  ) {
    const worker = await this.adminService.rejectWorkerVerification(workerId, 'admin-user', reason);
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
  async resolveComplaint(@Param('id') complaintId: string) {
    const complaint = await this.adminService.resolveComplaint(complaintId, 'admin-user');
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
  @HttpCode(HttpStatus.CREATED)
  async createService(
    @Body('name') name: string,
    @Body('iconUrl') iconUrl?: string,
  ) {
    const service = await this.adminService.createService(name, iconUrl);
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
  async getAnalytics() {
    const analytics = await this.adminService.getAnalytics();
    return {
      data: analytics,
    };
  }
}
