import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { WalletController } from './wallet.controller'
import { WalletService } from './wallet.service'
import { HouseService } from './house.service'

@Module({
  imports: [PrismaModule],
  controllers: [WalletController],
  providers: [WalletService, HouseService],
  exports: [WalletService, HouseService],
})
export class WalletModule {}
