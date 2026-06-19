import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CommissionService } from './commission.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('commission')
@UseGuards(JwtAuthGuard)
export class CommissionController {
  constructor(private readonly commissionService: CommissionService) {}

  // ─── WORKER ────────────────────────────────────────────────────────────────

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
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  getPendingPayments(
    @Query('skip') skip = '0',
    @Query('take') take = '20',
  ) {
    return this.commissionService.getPendingPayments(parseInt(skip), parseInt(take));
  }

  /** POST /commission/admin/:paymentId/approve  { adminUserId } */
  @Post('admin/:paymentId/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  approvePayment(
    @Param('paymentId') paymentId: string,
    @Request() req: any,
  ) {
    return this.commissionService.approvePayment(paymentId, req.user.id);
  }

  /** POST /commission/admin/:paymentId/reject  { reason } */
  @Post('admin/:paymentId/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  rejectPayment(
    @Param('paymentId') paymentId: string,
    @Body('reason') reason: string,
    @Request() req: any,
  ) {
    return this.commissionService.rejectPayment(paymentId, req.user.id, reason);
  }
}
