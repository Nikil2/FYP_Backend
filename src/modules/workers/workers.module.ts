import { Module } from '@nestjs/common';
import { WorkersService } from './workers.service';
import { WorkersController } from './workers.controller';
import { PrismaModule } from '../../../prisma/prisma.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [PrismaModule, WalletModule],
  controllers: [WorkersController],
  providers: [WorkersService],
  exports: [WorkersService],
})
export class WorkersModule {}
