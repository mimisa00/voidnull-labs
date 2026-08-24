import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { WalletService } from '../wallet/wallet.service'
import * as bcrypt from 'bcrypt'
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto'

const USER_SELECT = {
  id: true,
  email: true,
  username: true,
  displayName: true,
  isActive: true,
  is2faEnabled: true,
  createdAt: true,
  updatedAt: true,
  userRoles: { include: { role: { select: { id: true, name: true } } } },
}

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
  ) {}

  findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit
    return Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        select: USER_SELECT,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]).then(([data, total]) => ({
      data,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    }))
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    })
    if (!user) throw new NotFoundException(`User ${id} not found`)
    return user
  }

  async create(dto: CreateUserDto) {
    const exists = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    })
    if (exists) throw new ConflictException('Email or username already taken')
    const password = await bcrypt.hash(dto.password, 12)
    const user = await this.prisma.user.create({
      data: { ...dto, password },
      select: USER_SELECT,
    })
    await this.walletService.ensureWallet(user.id)
    return user
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id)
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: USER_SELECT,
    })
  }

  async remove(id: string) {
    await this.findOne(id)
    await this.prisma.user.delete({ where: { id } })
    return { message: 'User deleted' }
  }

  async assignRoles(userId: string, roleIds: string[]) {
    await this.findOne(userId)
    const uniqueRoleIds = [...new Set(roleIds)]
    await this.prisma.userRole.deleteMany({ where: { userId } })
    await this.prisma.userRole.createMany({
      data: uniqueRoleIds.map((roleId) => ({ userId, roleId })),
    })
    return this.findOne(userId)
  }
}
