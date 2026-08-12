import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { ApprovalService } from './approval.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PermissionsGuard } from '../rbac/guards/permissions.guard'
import { Permissions } from '../rbac/decorators/permissions.decorator'

@ApiTags('Approval')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('approval')
export class ApprovalController {
  constructor(private approvalService: ApprovalService) {}

  @Get('logs')
  @Permissions('operations:read')
  async getLogs(@Query('status') status?: string) {
    return this.approvalService.getLogs(status)
  }
}
