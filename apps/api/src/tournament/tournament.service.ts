import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common'
import { Decimal } from '@prisma/client/runtime/library'
import { PrismaService } from '../prisma/prisma.service'
import { WalletService } from '../wallet/wallet.service'
import { CreateTournamentDto } from './dto/create-tournament.dto'

const USER_SELECT = {
  id: true,
  username: true,
  displayName: true,
}

const PRIZE_SHARES = [50, 30, 20]

@Injectable()
export class TournamentService {
  constructor(
    private prisma: PrismaService,
    private wallet: WalletService,
  ) {}

  async create(dto: CreateTournamentDto) {
    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('startTime must be before endTime')
    }
    return this.prisma.tournament.create({
      data: {
        name: dto.name,
        status: 'waiting',
        startTime: dto.startTime,
        endTime: dto.endTime,
        maxPlayers: dto.maxPlayers,
        entryFee: dto.entryFee,
        prizePool: dto.prizePool ?? 0,
      },
    })
  }

  findAll() {
    return this.prisma.tournament.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { participants: true } } },
    })
  }

  async findOne(id: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
      include: {
        participants: {
          include: { user: { select: USER_SELECT } },
          orderBy: { entryTime: 'asc' },
        },
        results: {
          include: { user: { select: USER_SELECT } },
          orderBy: { rank: 'asc' },
        },
      },
    })
    if (!tournament) throw new NotFoundException(`Tournament ${id} not found`)
    return tournament
  }

  async join(id: string, userId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
    })
    if (!tournament) {
      throw new NotFoundException(`Tournament ${id} not found`)
    }
    if (tournament.status !== 'waiting') {
      throw new BadRequestException(`Tournament ${id} is not open for joining`)
    }

    const participantCount = await this.prisma.tournamentParticipant.count({
      where: { tournamentId: id },
    })
    if (participantCount >= tournament.maxPlayers) {
      throw new BadRequestException(`Tournament ${id} is full`)
    }

    const existing = await this.prisma.tournamentParticipant.findFirst({
      where: { tournamentId: id, userId },
    })
    if (existing) {
      throw new ConflictException(
        `User ${userId} has already joined tournament ${id}`,
      )
    }

    if (tournament.entryFee > 0) {
      await this.wallet.chargeEntryFee(
        userId,
        tournament.entryFee,
        `Tournament entry fee: ${tournament.name}`,
      )
    }

    const participant = await this.prisma.tournamentParticipant.create({
      data: {
        tournamentId: id,
        userId,
        status: 'joined',
      },
    })

    if (tournament.entryFee > 0) {
      await this.prisma.tournament.update({
        where: { id },
        data: { prizePool: { increment: tournament.entryFee } },
      })
    }

    return participant
  }

  async settle(id: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
    })
    if (!tournament) {
      throw new NotFoundException(`Tournament ${id} not found`)
    }
    if (tournament.status !== 'waiting' && tournament.status !== 'running') {
      throw new BadRequestException(
        `Tournament ${id} cannot be settled in status ${tournament.status}`,
      )
    }

    const settledCount = await this.prisma.tournamentResult.count({
      where: { tournamentId: id },
    })
    if (settledCount > 0) {
      throw new ConflictException(`Tournament ${id} has already been settled`)
    }

    const participants = await this.prisma.tournamentParticipant.findMany({
      where: { tournamentId: id },
      orderBy: { entryTime: 'asc' },
    })

    const wallets = participants.length
      ? await this.prisma.wallet.findMany({
          where: { userId: { in: participants.map((p) => p.userId) } },
        })
      : []
    const balanceByUser = new Map(wallets.map((w) => [w.userId, w.balance]))

    const ranked = participants
      .map((p) => ({
        userId: p.userId,
        finalBalance: balanceByUser.get(p.userId) ?? new Decimal(0),
      }))
      .sort(
        (a, b) =>
          b.finalBalance.minus(a.finalBalance).toNumber() ||
          a.userId.localeCompare(b.userId),
      )

    const prizes = this.distributePrizes(tournament.prizePool, ranked.length)

    if (ranked.length > 0) {
      await this.prisma.tournamentResult.createMany({
        data: ranked.map((p, i) => ({
          tournamentId: id,
          userId: p.userId,
          rank: i + 1,
          finalBalance: p.finalBalance,
          prize: prizes[i],
        })),
      })

      for (let i = 0; i < ranked.length; i++) {
        if (prizes[i] > 0) {
          await this.wallet.creditPrize(
            ranked[i].userId,
            prizes[i],
            `Tournament prize: ${tournament.name} (rank ${i + 1})`,
          )
        }
      }

      await this.prisma.tournamentParticipant.updateMany({
        where: { tournamentId: id },
        data: { status: 'completed' },
      })
    }

    await this.prisma.tournament.update({
      where: { id },
      data: { status: 'completed' },
    })

    return this.findOne(id)
  }

  // Integer-only prize split: fixed shares 50/30/20 for ranks 1-3,
  // any remainder from floor() goes to rank 1. No floats involved.
  private distributePrizes(prizePool: number, playerCount: number): number[] {
    const prizes = new Array(Math.max(playerCount, 0)).fill(0)
    for (let i = 0; i < playerCount && i < PRIZE_SHARES.length; i++) {
      prizes[i] = Math.floor((prizePool * PRIZE_SHARES[i]) / 100)
    }
    if (playerCount > 0) {
      const distributed = prizes.reduce((sum, p) => sum + p, 0)
      prizes[0] += prizePool - distributed
    }
    return prizes
  }
}
