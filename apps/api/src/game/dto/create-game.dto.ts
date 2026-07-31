import { IsInt, IsString, Min } from 'class-validator';

export class CreateGameDto {
  @IsString()
  type: string;

  @IsInt()
  @Min(2)
  maxPlayers: number;

  @IsInt()
  @Min(1)
  buyIn: number;
}