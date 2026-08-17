import { IsNumber, Min, IsOptional, IsString } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Decimal } from '@prisma/client/runtime/library'

export class AdjustBalanceDto {
  @ApiProperty({ type: 'number', description: 'Amount to adjust' })
  @IsNumber()
  @Min(0)
  amount: number

  @ApiPropertyOptional({ description: 'Optional description' })
  @IsOptional()
  @IsString()
  description?: string
}

export class GetBalanceResponseDto {
  id: string
  userId: string
  balance: Decimal
  currency: string
  createdAt: Date
  updatedAt: Date
}
