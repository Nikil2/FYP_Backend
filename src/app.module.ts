import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { UsersModule } from './modules/users/users.module';
import { WorkersModule } from './modules/workers/workers.module';
import { ServicesModule } from './modules/services/services.module';
import { AdminModule } from './modules/admin/admin.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { MessagesModule } from './modules/messages/messages.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { ComplaintsModule } from './modules/complaints/complaints.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { LocationsModule } from './modules/locations/locations.module';
import { ScheduleModule } from './modules/schedule/schedule.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { BonusModule } from './modules/bonus/bonus.module';
import { CustomerRewardsModule } from './modules/customer-rewards/customer-rewards.module';
import { CommissionModule } from './modules/commission/commission.module';
import { AiModule } from './modules/ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Infrastructure
    PrismaModule,
    AuthModule,
    RealtimeModule, // Socket.IO — global, used by Messages & Notifications
    // Core modules
    UsersModule,
    WorkersModule,
    ServicesModule,
    WalletModule,
    BonusModule,
    CustomerRewardsModule,
    CommissionModule,
    BookingsModule,
    // Feature modules
    MessagesModule,
    FeedbackModule,
    ComplaintsModule,
    NotificationsModule,
    UploadsModule,
    // Supporting modules
    LocationsModule,
    ScheduleModule,
    // AI
    AiModule,
    // Admin
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
