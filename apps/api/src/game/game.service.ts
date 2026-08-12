import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateGameDto, UpdateGameDto } from './game.dto'

@Injectable()
export class GameService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.game.findMany({
      select: {
        id: true,
        type: true,
        maxPlayers: true,
        buyIn: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  }

  async findOne(id: string) {
    const game = await this.prisma.game.findUnique({ where: { id } })
    if (!game) throw new NotFoundException(`Game ${id} not found`)
    return game
  }

  async create(dto: CreateGameDto) {
    return this.prisma.game.create({
      data: { ...dto, status: 'waiting', pot: 0 },
    })
  }

  async update(id: string, dto: UpdateGameDto) {
    await this.findOne(id)
    return this.prisma.game.update({ where: { id }, data: dto })
  }

  async remove(id: string) {
    await this.findOne(id)
    await this.prisma.game.delete({ where: { id } })
    return { message: 'Game deleted' }
  }
}
