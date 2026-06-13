import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { WalletModule } from '../wallet/wallet.module';
import { BonusService } from './bonus.service';
import { BonusController } from './bonus.controller';

@Module({
  imports: [PrismaModule, WalletModule],
  controllers: [BonusController],
  providers: [BonusService],
  exports: [BonusService],
})
export class BonusModule {}
