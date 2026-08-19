import { Module } from '@nestjs/common'
import { AppGateway } from './app.gateway'
import { AuthModule } from '../auth/auth.module'
import { GameModule } from '../game/game.module'

@Module({
  imports: [AuthModule, GameModule],
  providers: [AppGateway],
  exports: [AppGateway],
})
export class GatewayModule {}
