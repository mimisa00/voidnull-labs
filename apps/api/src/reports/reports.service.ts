import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getCageSummary() {
    const assets = await this.prisma.cageAsset.findMany()

    let houseRolling = 0
    let internalRolling = 0

    for (const asset of assets) {
      const amount = Number(asset.amount)
      if (asset.assetType === 'house_rolling') {
        houseRolling += amount
      } else if (asset.assetType === 'internal_rolling') {
        internalRolling += amount
      }
    }

    const totalAssets = houseRolling + internalRolling

    const performances = await this.prisma.agentPerformance.findMany()
    const unpaidCommission = performances.reduce(
      (sum, perf) => sum + Number(perf.commissionEarned),
      0,
    )

    return {
      totalAssets,
      houseRolling,
      internalRolling,
      unpaidCommission,
    }
  }

  async getAgentPerformance(period?: string) {
    const filterPeriod = period || this.getCurrentMonth()

    const performances = await this.prisma.agentPerformance.findMany({
      where: {
        period: filterPeriod,
      },
      include: {
        agent: {
          select: {
            id: true,
            displayName: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: {
        commissionEarned: 'desc',
      },
    })

    return performances.map((perf) => ({
      name: perf.agent.displayName || perf.agent.username || perf.agent.email,
      commission: Number(perf.commissionEarned),
    }))
  }

  private getCurrentMonth(): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    return `${year}-${month}`
  }
}
