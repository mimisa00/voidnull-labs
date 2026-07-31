import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Game, PlayerGame } from '@prisma/client';
import { AppGateway } from '../gateway/app.gateway';

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);

  constructor(
    private prisma: PrismaService,
    private gateway: AppGateway,
  ) {}

  /**
   * Create a new game instance
   */
  async createGame(gameType: string, maxPlayers: number, buyIn: number): Promise<Game> {
    const game = await this.prisma.game.create({
      data: {
        type: gameType,
        status: 'waiting',
        maxPlayers,
        buyIn,
        pot: 0,
      },
    });

    this.logger.log(`Created new ${gameType} game with ID: ${game.id}`);
    return game;
  }

  /**
   * Join a player to a game
   */
  async joinGame(gameId: string, playerId: string): Promise<{ success: boolean; playerPosition?: number }> {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: { players: true },
    });

    if (!game) {
      return { success: false };
    }

    // Check if game is full
    if (game.players.length >= game.maxPlayers) {
      return { success: false };
    }

    // Check if player already joined
    const existingPlayer = game.players.find(p => p.playerId === playerId);
    if (existingPlayer) {
      return { success: true, playerPosition: existingPlayer.position };
    }

    // Add player to game
    const playerPosition = game.players.length;
    const playerGame = await this.prisma.playerGame.create({
      data: {
        playerId,
        gameId,
        balance: 1000, // Starting balance for players
        hand: [],
        status: 'waiting',
        position: playerPosition,
      },
    });

    // Update game pot
    await this.prisma.game.update({
      where: { id: gameId },
      data: {
        pot: { increment: game.buyIn },
      },
    });

    this.logger.log(`Player ${playerId} joined game ${gameId} at position ${playerPosition}`);

    return { success: true, playerPosition };
  }

  /**
   * Handle a player action in the game
   */
  async handlePlayerAction(
    gameId: string,
    playerId: string,
    action: 'hit' | 'stand' | 'double' | 'split',
    betAmount?: number
  ): Promise<any> {
    // Verify player is in the game
    const playerGame = await this.prisma.playerGame.findFirst({
      where: {
        gameId,
        playerId,
      },
    });

    if (!playerGame) {
      return { success: false, error: 'Player not found in game' };
    }

    // For simplicity, we'll simulate basic Blackjack logic
    // In a real implementation, this would be more complex

    let result = {};

    switch (action) {
      case 'hit':
        // Simulate drawing a card (in a real implementation, this would use proper deck shuffling)
        const newHand = [...playerGame.hand, this.drawCard()];
        await this.prisma.playerGame.update({
          where: { id: playerGame.id },
          data: { hand: newHand },
        });
        result = { action: 'hit', newHand };
        break;

      case 'stand':
        // Player stands
        result = { action: 'stand' };
        break;

      case 'double':
        // Double down - in a real implementation, this would increase bet and draw one card
        if (betAmount) {
          const newHand = [...playerGame.hand, this.drawCard()];
          await this.prisma.playerGame.update({
            where: { id: playerGame.id },
            data: { hand: newHand },
          });
          result = { action: 'double', newHand };
        }
        break;

      case 'split':
        // Split - in a real implementation, this would create two hands
        result = { action: 'split' };
        break;
    }

    return {
      success: true,
      ...result,
    };
  }

  /**
   * Draw a random card for simulation purposes (in a real game, this would be properly shuffled)
   */
  private drawCard(): string {
    const suits = ['♠', '♥', '♦', '♣'];
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

    // Simplified card representation
    const suit = suits[Math.floor(Math.random() * suits.length)];
    const rank = ranks[Math.floor(Math.random() * ranks.length)];

    return `${rank}${suit}`;
  }

  /**
   * Start a game - transition from waiting to active state
   */
  async startGame(gameId: string): Promise<Game> {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: { players: true },
    });

    if (!game || game.status !== 'waiting') {
      throw new Error('Cannot start game - invalid state');
    }

    // Check if we have minimum players
    if (game.players.length < 2) {
      throw new Error('Not enough players to start game');
    }

    // Update game status to active
    const updatedGame = await this.prisma.game.update({
      where: { id: gameId },
      data: { status: 'active' },
    });

    this.logger.log(`Game ${gameId} started with ${game.players.length} players`);

    return updatedGame;
  }

  /**
   * End a game and determine winner
   */
  async endGame(gameId: string): Promise<Game> {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: { players: true },
    });

    if (!game || game.status !== 'active') {
      throw new Error('Cannot end game - invalid state');
    }

    // In a real implementation, we would determine winners based on hand values
    // For now, we'll simulate this with a random winner

    let winner = null;
    if (game.players.length > 0) {
      const randomIndex = Math.floor(Math.random() * game.players.length);
      winner = game.players[randomIndex];
    }

    // Update game status to completed
    const updatedGame = await this.prisma.game.update({
      where: { id: gameId },
      data: { status: 'completed' },
    });

    // Record game history
    if (winner) {
      await this.prisma.gameHistory.create({
        data: {
          gameId,
          winnerId: winner.playerId,
          payout: game.pot,
        },
      });
    }

    this.logger.log(`Game ${gameId} ended. Winner: ${winner?.playerId || 'None'}`);

    return updatedGame;
  }
}