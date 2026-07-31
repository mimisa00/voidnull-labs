import { IsString } from 'class-validator';

export class JoinGameDto {
  @IsString()
  playerId: string;
}