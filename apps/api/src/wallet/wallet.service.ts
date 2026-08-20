import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { Decimal } from '@prisma/client/runtime/library'

interface PayoutResult {
  playerId: string
  payout: number
  result: 'win' | 'loss' | 'push'
}

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  async getBalance(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    })
    if (!wallet) {
      throw new NotFoundException(`Wallet not found for user ${userId}`)
    }
    return wallet
  }

  async placeBet(userId: string, gameId: string, betAmount: number) {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId },
      })

      if (!wallet) {
        throw new NotFoundException(`Wallet not found for user ${userId}`)
      }

      if (wallet.balance.lessThan(new Decimal(betAmount))) {
        throw new BadRequestException('Insufficient balance')
      }

      const balanceBefore = wallet.balance
      const newBalance = balanceBefore.minus(new Decimal(betAmount))

      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: { balance: newBalance },
      })

      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'bet',
          amount: new Decimal(betAmount).negated(),
          balanceBefore,
          balanceAfter: newBalance,
          gameId,
        },
      })

      return updatedWallet
    })
  }

  async payoutWin(userId: string, gameId: string, payoutAmount: number) {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId },
      })

      if (!wallet) {
        throw new NotFoundException(`Wallet not found for user ${userId}`)
      }

      const balanceBefore = wallet.balance
      const newBalance = balanceBefore.plus(new Decimal(payoutAmount))

      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: { balance: newBalance },
      })

      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'win',
          amount: new Decimal(payoutAmount),
          balanceBefore,
          balanceAfter: newBalance,
          gameId,
        },
      })

      return updatedWallet
    })
  }

  async payoutGameResults(gameId: string, results: PayoutResult[]) {
    return this.prisma.$transaction(async (tx) => {
      const outcomes: Array<{
        playerId: string
        result: string
        payout: number
        newBalance: Decimal
      }> = []

      for (const result of results) {
        const wallet = await tx.wallet.findUnique({
          where: { userId: result.playerId },
        })

        if (!wallet) {
          throw new NotFoundException(
            `Wallet not found for user ${result.playerId}`,
          )
        }

        const balanceBefore = wallet.balance
        let newBalance = balanceBefore
        let transactionType = 'loss'

        if (result.payout > 0) {
          newBalance = balanceBefore.plus(new Decimal(result.payout))
          transactionType = result.result === 'push' ? 'refund' : 'win'
        }

        const updatedWallet = await tx.wallet.update({
          where: { userId: result.playerId },
          data: { balance: newBalance },
        })

        if (result.payout > 0) {
          await tx.transaction.create({
            data: {
              walletId: wallet.id,
              type: transactionType,
              amount: new Decimal(result.payout),
              balanceBefore,
              balanceAfter: newBalance,
              gameId,
            },
          })
        }

        outcomes.push({
          playerId: result.playerId,
          result: result.result,
          payout: result.payout,
          newBalance: updatedWallet.balance,
        })
      }

      return outcomes
    })
  }

  async deposit(userId: string, amount: number, description?: string) {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId },
      })

      if (!wallet) {
        throw new NotFoundException(`Wallet not found for user ${userId}`)
      }

      const balanceBefore = wallet.balance
      const newBalance = balanceBefore.plus(new Decimal(amount))

      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: { balance: newBalance },
      })

      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'deposit',
          amount: new Decimal(amount),
          balanceBefore,
          balanceAfter: newBalance,
          description,
        },
      })

      return updatedWallet
    })
  }

  async withdraw(userId: string, amount: number, description?: string) {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId },
      })

      if (!wallet) {
        throw new NotFoundException(`Wallet not found for user ${userId}`)
      }

      if (wallet.balance.lessThan(new Decimal(amount))) {
        throw new BadRequestException('Insufficient balance')
      }

      const balanceBefore = wallet.balance
      const newBalance = balanceBefore.minus(new Decimal(amount))

      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: { balance: newBalance },
      })

      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'withdrawal',
          amount: new Decimal(amount).negated(),
          balanceBefore,
          balanceAfter: newBalance,
          description,
        },
      })

      return updatedWallet
    })
  }

  async chargeEntryFee(userId: string, amount: number, description?: string) {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId },
      })

      if (!wallet) {
        throw new NotFoundException(`Wallet not found for user ${userId}`)
      }

      if (wallet.balance.lessThan(new Decimal(amount))) {
        throw new BadRequestException('Insufficient balance')
      }

      const balanceBefore = wallet.balance
      const newBalance = balanceBefore.minus(new Decimal(amount))

      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: { balance: newBalance },
      })

      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'tournament_entry',
          amount: new Decimal(amount).negated(),
          balanceBefore,
          balanceAfter: newBalance,
          description,
        },
      })

      return updatedWallet
    })
  }

  async creditPrize(userId: string, amount: number, description?: string) {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId },
      })

      if (!wallet) {
        throw new NotFoundException(`Wallet not found for user ${userId}`)
      }

      const balanceBefore = wallet.balance
      const newBalance = balanceBefore.plus(new Decimal(amount))

      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: { balance: newBalance },
      })

      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'tournament_prize',
          amount: new Decimal(amount),
          balanceBefore,
          balanceAfter: newBalance,
          description,
        },
      })

      return updatedWallet
    })
  }
}
