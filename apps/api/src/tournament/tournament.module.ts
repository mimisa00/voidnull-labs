import { Module } from '@nestjs/common'
import { WalletModule } from '../wallet/wallet.module'
import { TournamentController } from './tournament.controller'
import { TournamentService } from './tournament.service'

@Module({
  imports: [WalletModule],
  controllers: [TournamentController],
  providers: [TournamentService],
  exports: [TournamentService],
})
export class TournamentModule {}
