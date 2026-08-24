import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Inject,
  forwardRef,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { AppGateway } from '../gateway/app.gateway'
import { GameService } from './game.service'
import { CreateGameDto, UpdateGameDto, ReplenishGameDto } from './game.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PermissionsGuard } from '../rbac/guards/permissions.guard'
import { Permissions } from '../rbac/decorators/permissions.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'

@ApiTags('games')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('games')
export class GameController {
  constructor(
    private gameService: GameService,
    @Inject(forwardRef(() => AppGateway)) private gateway: AppGateway,
  ) {}

  @Get()
  @Permissions('games:read')
  findAll() {
    return this.gameService.findAll()
  }

  @Get(':id')
  @Permissions('games:read')
  findOne(@Param('id') id: string) {
    return this.gameService.findOne(id)
  }

  @Post()
  @Permissions('games:create')
  create(@Body() dto: CreateGameDto) {
    return this.gameService.create(dto)
  }

  @Patch(':id')
  @Permissions('games:update')
  update(@Param('id') id: string, @Body() dto: UpdateGameDto) {
    return this.gameService.update(id, dto)
  }

  @Delete(':id')
  @Permissions('games:delete')
  remove(@Param('id') id: string) {
    return this.gameService.remove(id)
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  @Permissions('games:update')
  close(@Param('id') id: string) {
    return this.gameService.closeGame(id)
  }

  @Post(':id/force-close')
  @HttpCode(HttpStatus.OK)
  @Permissions('games:update')
  forceClose(@Param('id') id: string) {
    return this.gameService.forceCloseGame(id)
  }

  @Post(':id/replenish')
  @HttpCode(HttpStatus.OK)
  @Permissions('games:update')
  replenish(@Param('id') id: string, @Body() dto: ReplenishGameDto) {
    return this.gameService.replenish(id, dto)
  }

  @Post(':id/forfeit')
  @HttpCode(HttpStatus.OK)
  @Permissions('games:play')
  async forfeit(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    const result = await this.gameService.forfeitGame(id, userId)
    // gameState 是 raw in-memory 狀態(含 deckCards + 莊家暗牌), 只供整桌 WS
    // 廣播使用, 不回給 REST 呼叫方(離場者不該拿到牌牆/暗牌)
    const { gameState, ...response } = result
    // REST forfeit 本身不發 WS 事件, 剩餘玩家收不到桌況變化/已入帳派彩。
    // 走 gateway 既有整桌廣播: 同 payload { gameId, state } 與遮蔽(不含 deckCards),
    // completed → game:updated + game:ended; waiting / playing → game:updated。
    // gameState 僅 completed 分支帶回(Redis 已清, 不可從 DB 重建);
    // 其餘分支不傳 override, 由 gateway 從 Redis / DB 重建。
    // 並行 close/settle race 分支(tableStatus closed/unknown)桌已終態, 跳過避免誤發 'waiting'。
    // 退款分支(refunded)桌維持 waiting/completed: 無 in-memory gameState,
    // gateway 從 DB 重建(只剩當輪 seated 玩家), 故 completed + refunded 也要發。
    if (
      gameState ||
      result.tableStatus === 'playing' ||
      result.tableStatus === 'waiting' ||
      (result.tableStatus === 'completed' && result.refunded)
    ) {
      await this.gateway.emitGameUpdate(id, gameState)
    }
    return response
  }
}
