import { Injectable } from '@nestjs/common'
import { Decimal } from '@prisma/client/runtime/library'
import { PrismaService } from '../prisma/prisma.service'

export interface LeaderboardEntry {
  rank: number
  userId: string
  username: string
  displayName: string | null
  totalWinnings: string
  gamesWon: number
}

const MAX_LIMIT = 100
const WIN_TYPES = ['win', 'refund']

@Injectable()
export class LeaderboardService {
  constructor(private prisma: PrismaService) {}

  async getTopWinners(limit: number): Promise<LeaderboardEntry[]> {
    const effectiveLimit = Math.min(Math.max(limit, 1), MAX_LIMIT)

    const rows = await this.prisma.transaction.groupBy({
      by: ['walletId'],
      where: { type: { in: WIN_TYPES } },
      _sum: { amount: true },
      _count: { _all: true },
    })

    if (rows.length === 0) return []

    const wallets = await this.prisma.wallet.findMany({
      where: { id: { in: rows.map((row) => row.walletId) } },
      include: {
        user: { select: { id: true, username: true, displayName: true } },
      },
    })

    const walletById = new Map(wallets.map((w) => [w.id, w]))

    const entries = rows.flatMap((row) => {
      const wallet = walletById.get(row.walletId)
      if (!wallet) return []
      return [
        {
          userId: wallet.userId,
          username: wallet.user.username,
          displayName: wallet.user.displayName,
          totalWinnings: row._sum.amount ?? new Decimal(0),
          gamesWon: row._count._all,
        },
      ]
    })

    return entries
      .sort(
        (a, b) =>
          b.totalWinnings.minus(a.totalWinnings).toNumber() ||
          b.gamesWon - a.gamesWon,
      )
      .slice(0, effectiveLimit)
      .map((entry, index) => ({
        rank: index + 1,
        userId: entry.userId,
        username: entry.username,
        displayName: entry.displayName,
        totalWinnings: entry.totalWinnings.toFixed(2),
        gamesWon: entry.gamesWon,
      }))
  }
}
