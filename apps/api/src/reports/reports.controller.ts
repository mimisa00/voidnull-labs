import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { ReportsService } from './reports.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PermissionsGuard } from '../rbac/guards/permissions.guard'
import { Permissions } from '../rbac/decorators/permissions.decorator'

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('cage-summary')
  @Permissions('operations:read')
  async getCageSummary() {
    return this.reportsService.getCageSummary()
  }

  @Get('agent-performance')
  @Permissions('operations:read')
  async getAgentPerformance(@Query('period') period?: string) {
    return this.reportsService.getAgentPerformance(period)
  }
}
