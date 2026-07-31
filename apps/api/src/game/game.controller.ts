import { Controller, Post, Body, Get, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import { GameService } from './game.service';
import { CreateGameDto } from './dto/create-game.dto';
import { JoinGameDto } from './dto/join-game.dto';
import { PlayerActionDto } from './dto/player-action.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Games')
@Controller('games')
export class GameController {
  constructor(private gameService: GameService) {}

  @Post('blackjack')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 201, description: 'Game created successfully' })
  async createBlackjackGame(@Body() createGameDto: CreateGameDto) {
    const game = await this.gameService.createGame('blackjack', createGameDto.maxPlayers, createGameDto.buyIn);
    return game;
  }

  @Get('blackjack/:id')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Game details retrieved successfully' })
  async getBlackjackGame(@Param('id') id: string) {
    // This would be implemented to return game state
    return { gameId: id, status: 'waiting', players: [] };
  }

  @Post('blackjack/:id/join')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Player joined game successfully' })
  async joinBlackjackGame(@Param('id') id: string, @Body() joinGameDto: JoinGameDto) {
    const result = await this.gameService.joinGame(id, joinGameDto.playerId);
    return result;
  }

  @Post('blackjack/:id/action')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Player action processed successfully' })
  async processBlackjackAction(
    @Param('id') id: string,
    @Body() playerActionDto: PlayerActionDto
  ) {
    const result = await this.gameService.handlePlayerAction(
      id,
      playerActionDto.playerId,
      playerActionDto.action,
      playerActionDto.betAmount
    );
    return result;
  }
}