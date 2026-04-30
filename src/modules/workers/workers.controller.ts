import { Controller, Post, Get, Put, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { WorkersService } from './workers.service';
import { CreateWorkerDto, WorkerResponseDto } from './dto';

@Controller('workers')
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  /**
   * Register a new worker
   * POST /workers/register
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async registerWorker(@Body() createWorkerDto: CreateWorkerDto): Promise<WorkerResponseDto> {
    return this.workersService.registerWorker(createWorkerDto);
  }

  /**
   * Get all workers (paginated)
   * GET /workers?skip=0&take=10
   */
  @Get()
  async getAllWorkers(
    @Query('skip') skip: string = '0',
    @Query('take') take: string = '10',
  ): Promise<WorkerResponseDto[]> {
    return this.workersService.getAllWorkers(parseInt(skip), parseInt(take));
  }

  /**
   * Get verified workers only
   * GET /workers/verified?skip=0&take=10
   */
  @Get('verified')
  async getVerifiedWorkers(
    @Query('skip') skip: string = '0',
    @Query('take') take: string = '10',
  ): Promise<WorkerResponseDto[]> {
    return this.workersService.getVerifiedWorkers(parseInt(skip), parseInt(take));
  }

  /**
   * Get worker by ID
   * GET /workers/:id
   */
  @Get('user/:userId')
  async getWorkerByUserId(@Param('userId') userId: string): Promise<WorkerResponseDto> {
    return this.workersService.getWorkerByUserId(userId);
  }

  /**
   * Get worker dashboard profile by user ID
   * GET /workers/me/:userId
   */
  @Get('me/:userId')
  async getMyWorkerProfile(@Param('userId') userId: string): Promise<WorkerResponseDto> {
    return this.workersService.getWorkerByUserId(userId);
  }

  /**
   * Get worker by ID
   * GET /workers/:id
   */
  @Get(':id')
  async getWorkerById(@Param('id') workerId: string): Promise<WorkerResponseDto> {
    return this.workersService.getWorkerById(workerId);
  }

  /**
   * Update worker profile
   * PUT /workers/:id
   */
  @Put(':id')
  async updateWorker(
    @Param('id') workerId: string,
    @Body() updateData: Partial<CreateWorkerDto>,
  ): Promise<WorkerResponseDto> {
    return this.workersService.updateWorker(workerId, updateData);
  }

  /**
   * Update worker online status
   * PUT /workers/:id/online-status
   */
  @Put(':id/online-status')
  async updateOnlineStatus(
    @Param('id') workerId: string,
    @Body() body: { isOnline: boolean },
  ): Promise<WorkerResponseDto> {
    return this.workersService.updateOnlineStatus(workerId, body.isOnline);
  }

  /**
   * Get worker orders
   * GET /workers/:id/orders?status=active|past
   */
  @Get(':id/orders')
  async getWorkerOrders(
    @Param('id') workerId: string,
    @Query('status') status: string = 'active',
    @Query('skip') skip: string = '0',
    @Query('take') take: string = '20',
  ) {
    return this.workersService.getWorkerOrders(workerId, status, parseInt(skip), parseInt(take));
  }

  /**
   * Get worker wallet summary
   * GET /workers/:id/wallet/summary
   */
  @Get(':id/wallet/summary')
  async getWalletSummary(@Param('id') workerId: string) {
    return this.workersService.getWalletSummary(workerId);
  }

  /**
   * Get worker wallet transactions
   * GET /workers/:id/wallet/transactions
   */
  @Get(':id/wallet/transactions')
  async getWalletTransactions(@Param('id') workerId: string) {
    return this.workersService.getWalletTransactions(workerId);
  }

  /**
   * Add portfolio image
   * POST /workers/:id/portfolio
   */
  @Post(':id/portfolio')
  async addPortfolioImage(
    @Param('id') workerId: string,
    @Body() body: { imageUrl: string; description?: string },
  ): Promise<{ id: string; imageUrl: string; description?: string }> {
    return this.workersService.addPortfolioImage(workerId, body.imageUrl, body.description);
  }

  /**
   * Get portfolio images
   * GET /workers/:id/portfolio
   */
  @Get(':id/portfolio')
  async getPortfolio(@Param('id') workerId: string): Promise<Array<{ id: string; imageUrl: string; description?: string }>> {
    return this.workersService.getPortfolio(workerId);
  }

  /**
   * Delete portfolio image
   * DELETE /workers/:id/portfolio/:portfolioId
   */
  @Delete(':id/portfolio/:portfolioId')
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
  async updatePortfolioImage(
    @Param('id') workerId: string,
    @Param('portfolioId') portfolioId: string,
    @Body() body: { description: string },
  ): Promise<{ id: string; imageUrl: string; description?: string }> {
    return this.workersService.updatePortfolioImage(workerId, portfolioId, body.description);
  }
}
