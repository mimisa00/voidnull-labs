import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { GameService } from '../game/game.service';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/',
})
export class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger = new Logger('AppGateway');

  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
    private gameService: GameService,
  ) {}

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
      if (!token) { client.disconnect(); return; }

      const payload = this.jwtService.verify(token, { secret: this.config.get('jwt.secret') });
      client.data.user = payload;

      // Join user-specific room for targeted notifications
      client.join(`user:${payload.sub}`);
      payload.roles?.forEach((role: string) => client.join(`role:${role}`));

      this.logger.log(`Client connected: ${client.id} (user: ${payload.email})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() room: string) {
    client.join(room);
    return { event: 'joinedRoom', data: room };
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(@ConnectedSocket() client: Socket, @MessageBody() room: string) {
    client.leave(room);
    return { event: 'leftRoom', data: room };
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    return { event: 'pong', data: { time: new Date().toISOString(), clientId: client.id } };
  }

  // Game-related events
  @SubscribeMessage('game:create')
  async handleCreateGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameType: string; maxPlayers: number; buyIn: number }
  ) {
    try {
      const game = await this.gameService.createGame(data.gameType, data.maxPlayers, data.buyIn);

      // Notify client of created game
      client.emit('game:created', {
        gameId: game.id,
        status: game.status,
        players: [],
      });

      return { success: true, gameId: game.id };
    } catch (error) {
      this.logger.error(`Error creating game: ${error.message}`);
      return { success: false, error: 'Failed to create game' };
    }
  }

  @SubscribeMessage('game:join')
  async handleJoinGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string; playerId: string }
  ) {
    try {
      const result = await this.gameService.joinGame(data.gameId, data.playerId);

      if (result.success) {
        // Notify client of successful join
        client.emit('game:joined', {
          gameId: data.gameId,
          playerPosition: result.playerPosition,
        });

        // Notify other players in the game room
        this.server.to(`game:${data.gameId}`).emit('game:updated', {
          gameId: data.gameId,
          status: 'waiting',
          players: [],
        });
      }

      return result;
    } catch (error) {
      this.logger.error(`Error joining game: ${error.message}`);
      return { success: false, error: 'Failed to join game' };
    }
  }

  @SubscribeMessage('game:action')
  async handleGameAction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      gameId: string;
      action: string;
      playerId: string;
      data?: object
    }
  ) {
    try {
      const result = await this.gameService.handlePlayerAction(
        data.gameId,
        data.playerId,
        data.action as any,
        data.data?.betAmount
      );

      if (result.success) {
        // Notify all players in the game room
        this.server.to(`game:${data.gameId}`).emit('game:updated', {
          gameId: data.gameId,
          status: 'active',
          currentTurn: data.playerId,
          players: [],
        });
      }

      return result;
    } catch (error) {
      this.logger.error(`Error processing game action: ${error.message}`);
      return { success: false, error: 'Failed to process action' };
    }
  }

  // Server-side emit methods (called by other services)
  notifyUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  notifyRole(role: string, event: string, data: any) {
    this.server.to(`role:${role}`).emit(event, data);
  }

  broadcast(event: string, data: any) {
    this.server.emit(event, data);
  }
}
