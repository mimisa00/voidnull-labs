import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { RedisModule } from '../redis/redis.module'
import { WalletModule } from '../wallet/wallet.module'
import { GameController } from './game.controller'
import { GameService } from './game.service'

@Module({
  imports: [PrismaModule, RedisModule, WalletModule],
  controllers: [GameController],
  providers: [GameService],
  exports: [GameService],
})
export class GameModule {}
