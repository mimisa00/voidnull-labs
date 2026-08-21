import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { Decimal } from '@prisma/client/runtime/library'
import { Prisma } from '@prisma/client'

@Injectable()
export class HouseService {
  constructor(private prisma: PrismaService) {}

  // NOTE: The house pool is a single row with assetType 'house_rolling' by
  // convention. CageAsset has no unique constraint on assetType, so every
  // reader must use findFirst on that type and never insert a second row —
  // extra rows would double-count the KPI totals.
  // tx: optional transaction client so callers can fold the house move into
  // their own $transaction (e.g. createGame: deduct + game.create atomic).
  async houseBalance(tx?: Prisma.TransactionClient): Promise<number> {
    const client = tx ?? this.prisma
    const row = await client.cageAsset.findFirst({
      where: { assetType: 'house_rolling' },
    })
    if (!row) {
      return 0
    }
    return row.amount.toNumber()
  }

  async houseMove(
    delta: number,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? this.prisma
    const row = await client.cageAsset.findFirst({
      where: { assetType: 'house_rolling' },
    })

    if (!row) {
      if (delta < 0) {
        // No row at all → the pool is zero, cannot cover a deduction.
        throw new BadRequestException('house pool insufficient')
      }
      // Bootstrap: row missing (e.g. clean DB without seed) — create the
      // single house row directly at the post-move balance.
      const created = await client.cageAsset.create({
        data: { assetType: 'house_rolling', amount: new Decimal(delta) },
      })
      return created.amount.toNumber()
    }

    if (delta < 0) {
      // Deduct via a relative atomic update with the balance guard in the
      // WHERE clause: under READ COMMITTED, two concurrent creates can no
      // longer both read the stale balance and double-spend it (lost update).
      const result = await client.cageAsset.updateMany({
        where: {
          id: row.id,
          amount: { gte: new Decimal(-delta) },
        },
        data: { amount: { increment: new Decimal(delta) } },
      })
      if (result.count === 0) {
        throw new BadRequestException('house pool insufficient')
      }
      return row.amount.plus(new Decimal(delta)).toNumber()
    }

    const updated = await client.cageAsset.update({
      where: { id: row.id },
      data: { amount: { increment: new Decimal(delta) } },
    })
    return updated.amount.toNumber()
  }
}
