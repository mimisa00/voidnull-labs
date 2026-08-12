import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.role.findMany({
      include: {
        rolePermissions: { include: { permission: true } },
        _count: { select: { userRoles: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: { include: { permission: true } },
        userRoles: {
          include: {
            user: { select: { id: true, email: true, username: true } },
          },
        },
      },
    })
    if (!role) throw new NotFoundException(`Role ${id} not found`)
    return role
  }

  async create(name: string, description?: string) {
    try {
      return await this.prisma.role.create({ data: { name, description } })
    } catch {
      throw new ConflictException(`Role '${name}' already exists`)
    }
  }

  async update(id: string, name?: string, description?: string) {
    await this.findOne(id)
    return this.prisma.role.update({
      where: { id },
      data: { name, description },
    })
  }

  async remove(id: string) {
    await this.findOne(id)
    return this.prisma.role.delete({ where: { id } })
  }

  async assignPermissions(roleId: string, permissionIds: string[]) {
    await this.findOne(roleId)
    // Replace all permissions
    await this.prisma.rolePermission.deleteMany({ where: { roleId } })
    await this.prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
    })
    return this.findOne(roleId)
  }
}
