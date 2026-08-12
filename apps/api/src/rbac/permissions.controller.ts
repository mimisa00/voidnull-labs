import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { PermissionsService } from './permissions.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PermissionsGuard } from './guards/permissions.guard'
import { Permissions } from './decorators/permissions.decorator'

@ApiTags('Permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('permissions')
export class PermissionsController {
  constructor(private permissionsService: PermissionsService) {}

  @Get()
  @Permissions('permissions:list')
  findAll(@Query('resource') resource?: string) {
    return resource
      ? this.permissionsService.findByResource(resource)
      : this.permissionsService.findAll()
  }
}
