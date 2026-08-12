import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger'
import { IsString, IsOptional, IsArray } from 'class-validator'
import { RolesService } from './roles.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PermissionsGuard } from './guards/permissions.guard'
import { Permissions } from './decorators/permissions.decorator'

class CreateRoleDto {
  @IsString() name: string
  @IsOptional() @IsString() description?: string
}

class AssignPermissionsDto {
  @IsArray() @IsString({ each: true }) permissionIds: string[]
}

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('roles')
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @Get()
  @Permissions('roles:list')
  @ApiOperation({ summary: 'List all roles' })
  findAll() {
    return this.rolesService.findAll()
  }

  @Get(':id')
  @Permissions('roles:read')
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id)
  }

  @Post()
  @Permissions('roles:create')
  create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto.name, dto.description)
  }

  @Put(':id')
  @Permissions('roles:update')
  update(@Param('id') id: string, @Body() dto: CreateRoleDto) {
    return this.rolesService.update(id, dto.name, dto.description)
  }

  @Delete(':id')
  @Permissions('roles:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.rolesService.remove(id)
  }

  @Put(':id/permissions')
  @Permissions('roles:update')
  @ApiOperation({ summary: 'Replace all permissions for a role' })
  assignPermissions(
    @Param('id') id: string,
    @Body() dto: AssignPermissionsDto,
  ) {
    return this.rolesService.assignPermissions(id, dto.permissionIds)
  }
}
