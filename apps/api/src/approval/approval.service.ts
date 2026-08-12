import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class ApprovalService {
  constructor(private prisma: PrismaService) {}

  async getLogs(status?: string) {
    const where = status ? { action: status } : {}

    const items = await this.prisma.approvalLog.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    })

    return {
      count: items.length,
      items,
    }
  }
}
