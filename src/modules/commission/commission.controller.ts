import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommissionService } from './commission.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('commission')
@UseGuards(JwtAuthGuard)
export class CommissionController {
  constructor(private readonly commissionService: CommissionService) {}

  /** GET /commission/worker/:workerId/due */
  @Get('worker/:workerId/due')
  getDueStatus(@Param('workerId') workerId: string) {
    return this.commissionService.getDueStatus(workerId);
  }

  /** POST /commission/worker/:workerId/pay  { proofImageUrl } */
  @Post('worker/:workerId/pay')
  submitProof(
    @Param('workerId') workerId: string,
    @Body('proofImageUrl') proofImageUrl: string,
  ) {
    return this.commissionService.submitPaymentProof(workerId, proofImageUrl);
  }

  /** GET /commission/worker/:workerId/payments */
  @Get('worker/:workerId/payments')
  getWorkerPayments(
    @Param('workerId') workerId: string,
    @Query('skip') skip = '0',
    @Query('take') take = '20',
  ) {
    return this.commissionService.getWorkerPayments(
      workerId,
      parseInt(skip),
      parseInt(take),
    );
  }

  // ─── ADMIN ────────────────────────────────────────────────────────────────

  /** GET /commission/admin/pending */
  @Get('admin/pending')
  getPendingPayments(
    @Query('skip') skip = '0',
    @Query('take') take = '20',
  ) {
    return this.commissionService.getPendingPayments(parseInt(skip), parseInt(take));
  }

  /** POST /commission/admin/:paymentId/approve  { adminUserId } */
  @Post('admin/:paymentId/approve')
  approvePayment(
    @Param('paymentId') paymentId: string,
    @Body('adminUserId') adminUserId: string,
  ) {
    return this.commissionService.approvePayment(paymentId, adminUserId);
  }

  /** POST /commission/admin/:paymentId/reject  { adminUserId, reason } */
  @Post('admin/:paymentId/reject')
  rejectPayment(
    @Param('paymentId') paymentId: string,
    @Body('adminUserId') adminUserId: string,
    @Body('reason') reason: string,
  ) {
    return this.commissionService.rejectPayment(paymentId, adminUserId, reason);
  }
}
