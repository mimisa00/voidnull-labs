import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger'
import { LeaderboardService } from './leaderboard.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PermissionsGuard } from '../rbac/guards/permissions.guard'
import { Permissions } from '../rbac/decorators/permissions.decorator'

@ApiTags('leaderboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private leaderboardService: LeaderboardService) {}

  @Get()
  @Permissions('leaderboard:read')
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getTopWinners(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.leaderboardService.getTopWinners(limit)
  }
}
