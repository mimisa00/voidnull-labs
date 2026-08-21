import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { GameService } from './game.service'
import { CreateGameDto, UpdateGameDto, ReplenishGameDto } from './game.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PermissionsGuard } from '../rbac/guards/permissions.guard'
import { Permissions } from '../rbac/decorators/permissions.decorator'

@ApiTags('games')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('games')
export class GameController {
  constructor(private gameService: GameService) {}

  @Get()
  @Permissions('games:read')
  findAll() {
    return this.gameService.findAll()
  }

  @Get(':id')
  @Permissions('games:read')
  findOne(@Param('id') id: string) {
    return this.gameService.findOne(id)
  }

  @Post()
  @Permissions('games:create')
  create(@Body() dto: CreateGameDto) {
    return this.gameService.create(dto)
  }

  @Patch(':id')
  @Permissions('games:update')
  update(@Param('id') id: string, @Body() dto: UpdateGameDto) {
    return this.gameService.update(id, dto)
  }

  @Delete(':id')
  @Permissions('games:delete')
  remove(@Param('id') id: string) {
    return this.gameService.remove(id)
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  @Permissions('games:update')
  close(@Param('id') id: string) {
    return this.gameService.closeGame(id)
  }

  @Post(':id/replenish')
  @HttpCode(HttpStatus.OK)
  @Permissions('games:update')
  replenish(@Param('id') id: string, @Body() dto: ReplenishGameDto) {
    return this.gameService.replenish(id, dto)
  }
}
