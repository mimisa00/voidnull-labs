import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common'
import { GameService } from './game.service'
import { CreateGameDto, UpdateGameDto } from './game.dto'

@Controller('games')
export class GameController {
  constructor(private gameService: GameService) {}

  @Get()
  findAll() {
    return this.gameService.findAll()
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.gameService.findOne(id)
  }

  @Post()
  create(@Body() dto: CreateGameDto) {
    return this.gameService.create(dto)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateGameDto) {
    return this.gameService.update(id, dto)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.gameService.remove(id)
  }
}
