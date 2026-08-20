import { BadRequestException, ConflictException } from '@nestjs/common'
import { Decimal } from '@prisma/client/runtime/library'
import { TournamentService } from '../../src/tournament/tournament.service'
import { CreateTournamentDto } from '../../src/tournament/dto/create-tournament.dto'

function makePrisma(overrides: Record<string, any> = {}) {
  return {
    tournament: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    tournamentParticipant: {
      count: jest.fn().mockResolvedValue(0),
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    tournamentResult: {
      count: jest.fn().mockResolvedValue(0),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    wallet: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    ...overrides,
  } as any
}

function makeWallet(overrides: Record<string, any> = {}) {
  return {
    chargeEntryFee: jest.fn().mockResolvedValue({ balance: new Decimal(900) }),
    creditPrize: jest.fn().mockResolvedValue({}),
    ...overrides,
  } as any
}

const openTournament = {
  id: 't1',
  name: 'Spring Cup',
  status: 'waiting',
  entryFee: 100,
  maxPlayers: 5,
  prizePool: 0,
}

describe('TournamentService', () => {
  describe('create', () => {
    it('defaults prizePool to 0 and starts in waiting status', async () => {
      const prisma = makePrisma({
        tournament: {
          ...makePrisma().tournament,
          create: jest.fn().mockResolvedValue({ id: 't1', status: 'waiting' }),
        },
      })
      const service = new TournamentService(prisma, makeWallet())

      const dto: CreateTournamentDto = {
        name: 'Test',
        startTime: new Date('2026-09-01T00:00:00Z'),
        endTime: new Date('2026-09-02T00:00:00Z'),
        maxPlayers: 4,
        entryFee: 50,
      }
      await service.create(dto)

      expect(prisma.tournament.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'waiting',
          prizePool: 0,
          entryFee: 50,
        }),
      })
    })

    // endTime before startTime would make the tournament unjoinable forever
    it('rejects startTime after endTime', async () => {
      const service = new TournamentService(makePrisma(), makeWallet())
      await expect(
        service.create({
          name: 'Broken',
          startTime: new Date('2026-09-02T00:00:00Z'),
          endTime: new Date('2026-09-01T00:00:00Z'),
          maxPlayers: 4,
          entryFee: 0,
        } as CreateTournamentDto),
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('join', () => {
    it('charges the entry fee and creates a participant for an open tournament', async () => {
      const prisma = makePrisma({
        tournament: {
          ...makePrisma().tournament,
          findUnique: jest.fn().mockResolvedValue(openTournament),
        },
        tournamentParticipant: {
          ...makePrisma().tournamentParticipant,
          count: jest.fn().mockResolvedValue(1),
          create: jest
            .fn()
            .mockResolvedValue({ id: 'p1', tournamentId: 't1', userId: 'u1' }),
        },
      })
      const wallet = makeWallet()
      const service = new TournamentService(prisma, wallet)

      await service.join('t1', 'u1')

      expect(wallet.chargeEntryFee).toHaveBeenCalledWith(
        'u1',
        100,
        'Tournament entry fee: Spring Cup',
      )
      expect(prisma.tournamentParticipant.create).toHaveBeenCalledWith({
        data: { tournamentId: 't1', userId: 'u1', status: 'joined' },
      })
      // entry fee must land in the prize pool exactly once per join
      expect(prisma.tournament.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: { prizePool: { increment: 100 } },
      })
    })

    // a duplicate join must not charge the wallet twice or create a 2nd participant
    it('rejects duplicate join with ConflictException without charging', async () => {
      const prisma = makePrisma({
        tournament: {
          ...makePrisma().tournament,
          findUnique: jest.fn().mockResolvedValue(openTournament),
        },
        tournamentParticipant: {
          ...makePrisma().tournamentParticipant,
          count: jest.fn().mockResolvedValue(2),
          findFirst: jest.fn().mockResolvedValue({ id: 'p0' }),
        },
      })
      const wallet = makeWallet()
      const service = new TournamentService(prisma, wallet)

      await expect(service.join('t1', 'u1')).rejects.toThrow(ConflictException)
      expect(wallet.chargeEntryFee).not.toHaveBeenCalled()
      expect(prisma.tournamentParticipant.create).not.toHaveBeenCalled()
    })

    // if the wallet charge fails (e.g. insufficient balance) nothing may persist
    it('propagates insufficient balance and persists nothing', async () => {
      const prisma = makePrisma({
        tournament: {
          ...makePrisma().tournament,
          findUnique: jest.fn().mockResolvedValue(openTournament),
        },
        tournamentParticipant: {
          ...makePrisma().tournamentParticipant,
          count: jest.fn().mockResolvedValue(0),
        },
      })
      const wallet = makeWallet({
        chargeEntryFee: jest
          .fn()
          .mockRejectedValue(new BadRequestException('Insufficient balance')),
      })
      const service = new TournamentService(prisma, wallet)

      await expect(service.join('t1', 'u1')).rejects.toThrow(
        'Insufficient balance',
      )
      expect(prisma.tournamentParticipant.create).not.toHaveBeenCalled()
      expect(prisma.tournament.update).not.toHaveBeenCalled()
    })

    it('rejects joining a closed tournament', async () => {
      const prisma = makePrisma({
        tournament: {
          ...makePrisma().tournament,
          findUnique: jest
            .fn()
            .mockResolvedValue({ ...openTournament, status: 'completed' }),
        },
      })
      const service = new TournamentService(prisma, makeWallet())

      await expect(service.join('t1', 'u1')).rejects.toThrow(
        BadRequestException,
      )
    })
  })

  describe('settle', () => {
    it('ranks by final balance, splits 50/30/20 integer-only and pays via wallet', async () => {
      // prizePool 100 comes from 1 joins x entryFee 100 at join time
      const pool = { ...openTournament, prizePool: 100 }
      const settled = {
        ...pool,
        status: 'completed',
        participants: [],
        results: [],
      }
      const prisma = makePrisma({
        tournament: {
          ...makePrisma().tournament,
          findUnique: jest
            .fn()
            .mockResolvedValueOnce(pool)
            .mockResolvedValue(settled),
        },
        tournamentParticipant: {
          ...makePrisma().tournamentParticipant,
          findMany: jest.fn().mockResolvedValue([
            { id: 'p1', userId: 'u1', entryTime: new Date() },
            { id: 'p2', userId: 'u2', entryTime: new Date() },
            { id: 'p3', userId: 'u3', entryTime: new Date() },
          ]),
        },
        wallet: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'w1', userId: 'u1', balance: new Decimal(5000) },
            { id: 'w2', userId: 'u2', balance: new Decimal(3000) },
            { id: 'w3', userId: 'u3', balance: new Decimal(1000) },
          ]),
        },
      })
      const wallet = makeWallet()
      const service = new TournamentService(prisma, wallet)

      await service.settle('t1')

      // ranks: u1 (5000) > u2 (3000) > u3 (1000); pool 100 -> 50/30/20
      expect(prisma.tournamentResult.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            tournamentId: 't1',
            userId: 'u1',
            rank: 1,
            prize: 50,
          }),
          expect.objectContaining({
            tournamentId: 't1',
            userId: 'u2',
            rank: 2,
            prize: 30,
          }),
          expect.objectContaining({
            tournamentId: 't1',
            userId: 'u3',
            rank: 3,
            prize: 20,
          }),
        ],
      })
      const created = prisma.tournamentResult.createMany.mock.calls[0][0].data
      expect(created[0].finalBalance.toNumber()).toBe(5000)
      expect(created[1].finalBalance.toNumber()).toBe(3000)
      expect(created[2].finalBalance.toNumber()).toBe(1000)

      expect(wallet.creditPrize).toHaveBeenCalledTimes(3)
      expect(wallet.creditPrize).toHaveBeenCalledWith(
        'u1',
        50,
        'Tournament prize: Spring Cup (rank 1)',
      )
      expect(wallet.creditPrize).toHaveBeenCalledWith(
        'u2',
        30,
        'Tournament prize: Spring Cup (rank 2)',
      )
      expect(wallet.creditPrize).toHaveBeenCalledWith(
        'u3',
        20,
        'Tournament prize: Spring Cup (rank 3)',
      )
      expect(prisma.tournament.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: { status: 'completed' },
      })
    })

    // settling twice must be impossible: results already exist, no double pay
    it('rejects re-settle with ConflictException', async () => {
      const prisma = makePrisma({
        tournament: {
          ...makePrisma().tournament,
          findUnique: jest.fn().mockResolvedValue(openTournament),
        },
        tournamentResult: {
          count: jest.fn().mockResolvedValue(3),
          createMany: jest.fn(),
        },
      })
      const wallet = makeWallet()
      const service = new TournamentService(prisma, wallet)

      await expect(service.settle('t1')).rejects.toThrow(ConflictException)
      expect(wallet.creditPrize).not.toHaveBeenCalled()
    })
  })
})
