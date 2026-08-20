import { Decimal } from '@prisma/client/runtime/library'
import { LeaderboardService } from '../../src/leaderboard/leaderboard.service'

describe('LeaderboardService', () => {
  it('ranks by total winnings desc, breaks ties by gamesWon, assigns 1-based rank', async () => {
    // tie between u1 and u3 (1500 each): more wins must rank higher
    const prisma = {
      transaction: {
        groupBy: jest.fn().mockResolvedValue([
          {
            walletId: 'w1',
            _sum: { amount: new Decimal('1500') },
            _count: { _all: 3 },
          },
          {
            walletId: 'w2',
            _sum: { amount: new Decimal('4200') },
            _count: { _all: 5 },
          },
          {
            walletId: 'w3',
            _sum: { amount: new Decimal('1500') },
            _count: { _all: 7 },
          },
        ]),
      },
      wallet: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'w1',
            userId: 'u1',
            user: { id: 'u1', username: 'alice', displayName: 'Alice' },
          },
          {
            id: 'w2',
            userId: 'u2',
            user: { id: 'u2', username: 'bob', displayName: null },
          },
          {
            id: 'w3',
            userId: 'u3',
            user: { id: 'u3', username: 'carol', displayName: 'Carol' },
          },
        ]),
      },
    } as any
    const service = new LeaderboardService(prisma)

    const rows = await service.getTopWinners(10)

    expect(rows).toEqual([
      {
        rank: 1,
        userId: 'u2',
        username: 'bob',
        displayName: null,
        totalWinnings: '4200.00',
        gamesWon: 5,
      },
      {
        rank: 2,
        userId: 'u3',
        username: 'carol',
        displayName: 'Carol',
        totalWinnings: '1500.00',
        gamesWon: 7,
      },
      {
        rank: 3,
        userId: 'u1',
        username: 'alice',
        displayName: 'Alice',
        totalWinnings: '1500.00',
        gamesWon: 3,
      },
    ])
  })

  it('truncates to limit', async () => {
    const prisma = {
      transaction: {
        groupBy: jest.fn().mockResolvedValue([
          {
            walletId: 'w1',
            _sum: { amount: new Decimal('100') },
            _count: { _all: 1 },
          },
          {
            walletId: 'w2',
            _sum: { amount: new Decimal('200') },
            _count: { _all: 1 },
          },
        ]),
      },
      wallet: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'w1',
            userId: 'u1',
            user: { id: 'u1', username: 'alice', displayName: null },
          },
          {
            id: 'w2',
            userId: 'u2',
            user: { id: 'u2', username: 'bob', displayName: null },
          },
        ]),
      },
    } as any
    const service = new LeaderboardService(prisma)

    const rows = await service.getTopWinners(1)

    expect(rows).toEqual([
      {
        rank: 1,
        userId: 'u2',
        username: 'bob',
        displayName: null,
        totalWinnings: '200.00',
        gamesWon: 1,
      },
    ])
  })

  it('returns an empty list when no win transactions exist', async () => {
    const prisma = {
      transaction: { groupBy: jest.fn().mockResolvedValue([]) },
      wallet: { findMany: jest.fn() },
    } as any
    const service = new LeaderboardService(prisma)

    await expect(service.getTopWinners(10)).resolves.toEqual([])
  })
})
