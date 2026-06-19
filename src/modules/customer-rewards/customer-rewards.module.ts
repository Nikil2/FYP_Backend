import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CustomerRewardsService } from './customer-rewards.service';
import { CustomerRewardsController } from './customer-rewards.controller';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [CustomerRewardsController],
  providers: [CustomerRewardsService],
  exports: [CustomerRewardsService],
})
export class CustomerRewardsModule {}
