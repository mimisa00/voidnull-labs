import { IsString, IsInt, Min, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGameDto {
  @ApiProperty() @IsString() type: string;
  @ApiProperty() @IsInt() @Min(1) maxPlayers: number;
  @ApiProperty() @IsInt() @Min(0) buyIn: number;
}

export class UpdateGameDto {
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) maxPlayers?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) buyIn?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}
