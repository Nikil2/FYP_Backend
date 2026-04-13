import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from './modules/users/users.module';
import { WorkersModule } from './modules/workers/workers.module';
import { ServicesModule } from './modules/services/services.module';

@Module({
  imports: [PrismaModule, UsersModule, WorkersModule, ServicesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
