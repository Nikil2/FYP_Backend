import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WalletModule } from '../wallet/wallet.module';
import { BonusModule } from '../bonus/bonus.module';
import { CustomerRewardsModule } from '../customer-rewards/customer-rewards.module';
import { CommissionModule } from '../commission/commission.module';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [PrismaModule, NotificationsModule, WalletModule, BonusModule, CustomerRewardsModule, CommissionModule],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
