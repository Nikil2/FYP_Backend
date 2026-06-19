import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CustomerRewardsService } from './customer-rewards.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('customer-rewards')
@UseGuards(JwtAuthGuard)
export class CustomerRewardsController {
  constructor(private readonly rewardsService: CustomerRewardsService) {}

  /** GET /customer-rewards/:userId/summary */
  @Get(':userId/summary')
  getSummary(@Param('userId') userId: string) {
    return this.rewardsService.getSummary(userId);
  }

  /** GET /customer-rewards/:userId/transactions */
  @Get(':userId/transactions')
  getTransactions(
    @Param('userId') userId: string,
    @Query('skip') skip = '0',
    @Query('take') take = '50',
  ) {
    return this.rewardsService.getTransactions(userId, parseInt(skip), parseInt(take));
  }
}
