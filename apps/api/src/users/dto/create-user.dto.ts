import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsBoolean,
  IsArray,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateUserDto {
  @ApiProperty() @IsEmail() email: string
  @ApiProperty() @IsString() @MinLength(3) username: string
  @ApiProperty() @IsString() @MinLength(8) password: string
  @ApiPropertyOptional() @IsOptional() @IsString() displayName?: string
}

export class UpdateUserDto {
  @ApiPropertyOptional() @IsOptional() @IsString() displayName?: string
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean
}

export class AssignRolesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  roleIds: string[]
}
