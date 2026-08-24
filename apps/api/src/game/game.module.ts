import { forwardRef, Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { RedisModule } from '../redis/redis.module'
import { WalletModule } from '../wallet/wallet.module'
import { GatewayModule } from '../gateway/gateway.module'
import { GameController } from './game.controller'
import { GameService } from './game.service'

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    WalletModule,
    // 循環 module import(GatewayModule 反向 import GameModule 取 GameService),
    // provider 圖無環(AppGateway → GameService, GameController → AppGateway)
    forwardRef(() => GatewayModule),
  ],
  controllers: [GameController],
  providers: [GameService],
  exports: [GameService],
})
export class GameModule {}
