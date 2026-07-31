import { Module } from '@nestjs/common';
import { GameService } from './game.service';
import { PrismaModule } from '../prisma/prisma.module';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [PrismaModule, GatewayModule],
  controllers: [],
  providers: [GameService],
  exports: [GameService],
})
export class GameModule {}