import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { WorkersService } from './workers.service';
import {
  CreateWorkerDto,
  WorkerResponseDto,
  UpdateOnlineStatusResponseDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('workers')
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  // ==================== PUBLIC ENDPOINTS ====================

  /**
   * Register a new worker (public — done during signup)
   * POST /workers/register
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async registerWorker(
    @Body() createWorkerDto: CreateWorkerDto,
  ): Promise<WorkerResponseDto> {
    return this.workersService.registerWorker(createWorkerDto);
  }

  /**
   * Get all workers (public — for customer browsing)
   * GET /workers?skip=0&take=10
   */
  @Get()
  async getAllWorkers(
    @Query('skip') skip: string = '0',
    @Query('take') take: string = '10',
    @Query('serviceId') serviceId?: string,
    @Query('categoryId') categoryId?: string,
  ): Promise<WorkerResponseDto[]> {
    return this.workersService.getAllWorkers(
      parseInt(skip),
      parseInt(take),
      serviceId ? parseInt(serviceId) : undefined,
      categoryId,
    );
  }

  /**
   * Get verified workers only (public)
   * GET /workers/verified?skip=0&take=10
   */
  @Get('verified')
  async getVerifiedWorkers(
    @Query('skip') skip: string = '0',
    @Query('take') take: string = '10',
    @Query('serviceId') serviceId?: string,
    @Query('categoryId') categoryId?: string,
  ): Promise<WorkerResponseDto[]> {
    return this.workersService.getVerifiedWorkers(
      parseInt(skip),
      parseInt(take),
      serviceId ? parseInt(serviceId) : undefined,
      categoryId,
    );
  }

  /**
   * Get worker by ID (public — for customer viewing worker detail)
   * GET /workers/:id
   */
  @Get(':id')
  async getWorkerById(
    @Param('id') workerId: string,
  ): Promise<WorkerResponseDto> {
    return this.workersService.getWorkerById(workerId);
  }

  // ==================== AUTHENTICATED ENDPOINTS ====================

  /**
   * Get current worker's profile using JWT
   * GET /workers/me/profile
   */
  @Get('me/profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.WORKER)
  async getMyWorkerProfile(
    @CurrentUser('sub') userId: string,
  ): Promise<WorkerResponseDto> {
    return this.workersService.getWorkerByUserId(userId);
  }

  /**
   * Get worker by user ID
   * GET /workers/user/:userId
   */
  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  async getWorkerByUserId(
    @Param('userId') userId: string,
  ): Promise<WorkerResponseDto> {
    return this.workersService.getWorkerByUserId(userId);
  }

  /**
   * Get worker dashboard profile by user ID (legacy — use /me/profile instead)
   * GET /workers/me/:userId
   */
  @Get('me/:userId')
  @UseGuards(JwtAuthGuard)
  async getMyWorkerProfileById(
    @Param('userId') userId: string,
  ): Promise<WorkerResponseDto> {
    return this.workersService.getWorkerByUserId(userId);
  }

  /**
   * Update worker profile
   * PUT /workers/:id
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateWorker(
    @Param('id') workerId: string,
    @Body() updateData: Partial<CreateWorkerDto>,
  ): Promise<WorkerResponseDto> {
    return this.workersService.updateWorker(workerId, updateData);
  }

  /**
   * Replace worker services (add/remove/update prices)
   * PUT /workers/:id/services
   */
  @Put(':id/services')
  @UseGuards(JwtAuthGuard)
  async updateWorkerServices(
    @Param('id') workerId: string,
    @Body() body: { services: { serviceId: number; price: number }[] },
  ) {
    return this.workersService.updateWorkerServices(workerId, body.services);
  }

  /**
   * Update worker online status
   * PUT /workers/:id/online-status
   */
  @Put(':id/online-status')
  @UseGuards(JwtAuthGuard)
  async updateOnlineStatus(
    @Param('id') workerId: string,
    @Body() body: { isOnline: boolean },
  ): Promise<UpdateOnlineStatusResponseDto> {
    return this.workersService.updateOnlineStatus(workerId, body.isOnline);
  }

  /**
   * Get worker orders
   * GET /workers/:id/orders?status=active|past
   */
  @Get(':id/orders')
  @UseGuards(JwtAuthGuard)
  async getWorkerOrders(
    @Param('id') workerId: string,
    @Query('status') status: string = 'active',
    @Query('skip') skip: string = '0',
    @Query('take') take: string = '20',
  ) {
    return this.workersService.getWorkerOrders(
      workerId,
      status,
      parseInt(skip),
      parseInt(take),
    );
  }

  /**
   * Get worker wallet summary
   * GET /workers/:id/wallet/summary
   */
  @Get(':id/wallet/summary')
  @UseGuards(JwtAuthGuard)
  async getWalletSummary(@Param('id') workerId: string) {
    return this.workersService.getWalletSummary(workerId);
  }

  /**
   * Get worker wallet transactions
   * GET /workers/:id/wallet/transactions
   */
  @Get(':id/wallet/transactions')
  @UseGuards(JwtAuthGuard)
  async getWalletTransactions(@Param('id') workerId: string) {
    return this.workersService.getWalletTransactions(workerId);
  }

  /**
   * Add portfolio image
   * POST /workers/:id/portfolio
   */
  @Post(':id/portfolio')
  @UseGuards(JwtAuthGuard)
  async addPortfolioImage(
    @Param('id') workerId: string,
    @Body() body: { imageUrl: string; description?: string },
  ): Promise<{ id: string; imageUrl: string; description?: string }> {
    return this.workersService.addPortfolioImage(
      workerId,
      body.imageUrl,
      body.description,
    );
  }

  /**
   * Get portfolio images (public)
   * GET /workers/:id/portfolio
   */
  @Get(':id/portfolio')
  async getPortfolio(
    @Param('id') workerId: string,
  ): Promise<Array<{ id: string; imageUrl: string; description?: string }>> {
    return this.workersService.getPortfolio(workerId);
  }

  /**
   * Delete portfolio image
   * DELETE /workers/:id/portfolio/:portfolioId
   */
  @Delete(':id/portfolio/:portfolioId')
  @UseGuards(JwtAuthGuard)
  async deletePortfolioImage(
    @Param('id') workerId: string,
    @Param('portfolioId') portfolioId: string,
  ): Promise<{ message: string }> {
    return this.workersService.deletePortfolioImage(workerId, portfolioId);
  }

  /**
   * Update portfolio image description
   * PUT /workers/:id/portfolio/:portfolioId
   */
  @Put(':id/portfolio/:portfolioId')
  @UseGuards(JwtAuthGuard)
  async updatePortfolioImage(
    @Param('id') workerId: string,
    @Param('portfolioId') portfolioId: string,
    @Body() body: { description: string },
  ): Promise<{ id: string; imageUrl: string; description?: string }> {
    return this.workersService.updatePortfolioImage(
      workerId,
      portfolioId,
      body.description,
    );
  }
}
