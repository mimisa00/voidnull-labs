import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { TournamentService } from './tournament.service'
import { CreateTournamentDto } from './dto/create-tournament.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PermissionsGuard } from '../rbac/guards/permissions.guard'
import { Permissions } from '../rbac/decorators/permissions.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'

@ApiTags('tournaments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('tournaments')
export class TournamentController {
  constructor(private tournamentService: TournamentService) {}

  @Get()
  @Permissions('tournament:read')
  findAll() {
    return this.tournamentService.findAll()
  }

  @Get(':id')
  @Permissions('tournament:read')
  findOne(@Param('id') id: string) {
    return this.tournamentService.findOne(id)
  }

  @Post()
  @Permissions('tournament:create')
  create(@Body() dto: CreateTournamentDto) {
    return this.tournamentService.create(dto)
  }

  @Post(':id/join')
  @Permissions('tournament:join')
  join(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.tournamentService.join(id, userId)
  }

  @Post(':id/settle')
  @HttpCode(HttpStatus.OK)
  @Permissions('tournament:create')
  settle(@Param('id') id: string) {
    return this.tournamentService.settle(id)
  }
}
