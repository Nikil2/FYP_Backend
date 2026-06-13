import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { TopupDto } from './dto/topup.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  /**
   * GET /wallet/worker/:workerId/summary
   * Real wallet summary (balance, earnings, commission, bonuses).
   */
  @Get('worker/:workerId/summary')
  async getSummary(@Param('workerId') workerId: string) {
    return this.walletService.getSummary(workerId);
  }

  /**
   * GET /wallet/worker/:workerId/transactions
   * Full ledger, newest first.
   */
  @Get('worker/:workerId/transactions')
  async getTransactions(
    @Param('workerId') workerId: string,
    @Query('skip') skip = '0',
    @Query('take') take = '50',
  ) {
    return this.walletService.getTransactions(
      workerId,
      parseInt(skip),
      parseInt(take),
    );
  }

  /**
   * POST /wallet/worker/:workerId/topup
   * Mock / admin top-up (no real payment gateway yet).
   */
  @Post('worker/:workerId/topup')
  async topup(@Param('workerId') workerId: string, @Body() dto: TopupDto) {
    return this.walletService.topup(workerId, dto.amount);
  }
}
