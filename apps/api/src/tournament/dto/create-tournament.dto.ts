import {
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateTournamentDto {
  @ApiProperty({ description: 'Tournament name' })
  @IsString()
  @MinLength(1)
  name: string

  @ApiProperty({ description: 'Start time (ISO 8601)' })
  @IsDate()
  @Type(() => Date)
  startTime: Date

  @ApiProperty({ description: 'End time (ISO 8601)' })
  @IsDate()
  @Type(() => Date)
  endTime: Date

  @ApiProperty({ description: 'Maximum number of participants' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  maxPlayers: number

  @ApiProperty({ description: 'Entry fee in cents (0 for free entry)' })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  entryFee: number

  @ApiPropertyOptional({
    description:
      'Starting prize pool in cents (defaults to 0; grows with each entry fee)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  prizePool?: number
}
