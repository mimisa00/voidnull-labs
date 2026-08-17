import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
// import { ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration'
import { PrismaModule } from './prisma/prisma.module'
import { RedisModule } from './redis/redis.module'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { RbacModule } from './rbac/rbac.module'
import { GatewayModule } from './gateway/gateway.module'
import { GameModule } from './game/game.module'
import { ReportsModule } from './reports/reports.module'
import { ApprovalModule } from './approval/approval.module'
import { WalletModule } from './wallet/wallet.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),
    // ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    RbacModule,
    GatewayModule,
    GameModule,
    ReportsModule,
    ApprovalModule,
    WalletModule,
  ],
})
export class AppModule {}
