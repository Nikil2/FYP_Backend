import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from './modules/users/users.module';
import { WorkersModule } from './modules/workers/workers.module';
import { ServicesModule } from './modules/services/services.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [PrismaModule, UsersModule, WorkersModule, ServicesModule, AdminModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
