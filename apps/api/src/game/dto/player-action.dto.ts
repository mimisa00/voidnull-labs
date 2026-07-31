import { IsString, IsOptional, IsInt } from 'class-validator';

export class PlayerActionDto {
  @IsString()
  action: 'hit' | 'stand' | 'double' | 'split';

  @IsString()
  playerId: string;

  @IsOptional()
  @IsInt()
  betAmount?: number;
}