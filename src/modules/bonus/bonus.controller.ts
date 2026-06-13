import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { BonusService } from './bonus.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('bonus')
@UseGuards(JwtAuthGuard)
export class BonusController {
  constructor(private readonly bonusService: BonusService) {}

  /**
   * GET /bonus/worker/:workerId/progress
   * Progress toward the next 20-job cashback + current tier (US-001, 002, 004).
   */
  @Get('worker/:workerId/progress')
  async getProgress(@Param('workerId') workerId: string) {
    return this.bonusService.getProgress(workerId);
  }

  /**
   * GET /bonus/worker/:workerId/history
   * Previously earned (and rejected) bonus windows (US-006).
   */
  @Get('worker/:workerId/history')
  async getHistory(
    @Param('workerId') workerId: string,
    @Query('skip') skip = '0',
    @Query('take') take = '20',
  ) {
    return this.bonusService.getHistory(
      workerId,
      parseInt(skip),
      parseInt(take),
    );
  }
}
