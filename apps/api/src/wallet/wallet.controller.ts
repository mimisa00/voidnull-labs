import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { WalletService } from './wallet.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PermissionsGuard } from '../rbac/guards/permissions.guard'
import { Permissions } from '../rbac/decorators/permissions.decorator'
import { AdjustBalanceDto } from './wallet.dto'
import { JwtPayload } from '../auth/decorators/current-user.decorator'

@ApiTags('wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('wallet')
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Get('me')
  @Permissions('wallet:read')
  async getMyBalance(@Req() req: any) {
    const user = req.user as JwtPayload
    return this.walletService.getBalance(user.sub)
  }

  @Post(':userId/deposit')
  @Permissions('wallet:deposit')
  async depositBalance(
    @Param('userId') userId: string,
    @Body() dto: AdjustBalanceDto,
  ) {
    const updatedWallet = await this.walletService.deposit(
      userId,
      dto.amount,
      dto.description,
    )
    return {
      message: 'Deposit successful',
      userId,
      amount: dto.amount,
      newBalance: updatedWallet.balance,
    }
  }

  @Post(':userId/withdraw')
  @Permissions('wallet:withdraw')
  async withdrawBalance(
    @Param('userId') userId: string,
    @Body() dto: AdjustBalanceDto,
  ) {
    const updatedWallet = await this.walletService.withdraw(
      userId,
      dto.amount,
      dto.description,
    )
    return {
      message: 'Withdrawal successful',
      userId,
      amount: dto.amount,
      newBalance: updatedWallet.balance,
    }
  }
}
