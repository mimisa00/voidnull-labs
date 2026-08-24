import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'
import { WalletService } from '../wallet/wallet.service'
import { HouseService } from '../wallet/house.service'
import { Deck, Card } from './engines/card-deck'
import { BlackjackEngine } from './engines/blackjack.engine'
import { GameStateMachine } from './game-state-machine'
import {
  GameState,
  GameResult,
  PlayerState,
  GameAction,
  BroadcastState,
  PlayingCard,
  PlayerEntry,
} from './interfaces/game-state.interface'
import { CreateGameDto, UpdateGameDto, ReplenishGameDto } from './game.dto'

const RANK_TO_NUMBER: Record<Card['rank'], number> = {
  A: 14,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
}

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name)
  private gameActionQueues = new Map<string, Promise<any>>()

  constructor(
    private prisma: PrismaService,
    private wallet: WalletService,
    private redis: RedisService,
    private house: HouseService,
  ) {}

  findAll() {
    return this.prisma.game.findMany({
      where: { status: { not: 'closed' } },
      select: {
        id: true,
        type: true,
        tableNumber: true,
        maxPlayers: true,
        buyIn: true,
        status: true,
        bankroll: true,
        createdAt: true,
        updatedAt: true,
        players: { select: { user: { select: { username: true } } } },
      },
    })
  }

  async findOne(id: string) {
    const game = await this.prisma.game.findUnique({ where: { id } })
    if (!game) throw new NotFoundException(`Game ${id} not found`)
    return game
  }

  async create(dto: CreateGameDto) {
    const bankroll = dto.bankroll ?? dto.maxPlayers * dto.buyIn
    return this.prisma.$transaction(async (tx) => {
      // 不足守衛在 houseMove 內(帶 gte 條件的原子 updateMany),
      // 此處不再做預讀——預檢是 TOCTOU 冗餘。
      await this.house.houseMove(-bankroll, tx)
      // 桌號指派: max+1, 併發下 @unique 約束會擋重複
      const max = await tx.game.aggregate({ _max: { tableNumber: true } })
      const tableNumber = (max._max.tableNumber ?? 0) + 1
      return tx.game.create({
        data: { ...dto, bankroll, status: 'waiting', pot: 0, tableNumber },
      })
    })
  }

  async update(id: string, dto: UpdateGameDto) {
    await this.findOne(id)
    return this.prisma.game.update({ where: { id }, data: dto })
  }

  async remove(id: string) {
    // 與 join 同 chain(key = join:${id}): join 的扣款/bankroll/入座列雖已收進
    // 單一 tx, 但 remove 鎖後回流 house 前仍需擋住並發 join 的 bankroll
    // increment, 故沿用同一條 per-game queue 串行化
    return this.enqueueGameAction(`join:${id}`, () => this._removeInternal(id))
  }

  private async _removeInternal(id: string) {
    // findOne 預檢是 tx 外 advisory(快速 404 / 403); 權威檢查與寫入全在 tx 內
    const game = await this.findOne(id)
    if (game.status === 'playing') {
      throw new ForbiddenException(
        `Game ${id} is playing, close or forfeit before deleting`,
      )
    }
    const seatedPlayers = await this.prisma.playerGame.count({
      where: { gameId: id, status: 'playing' },
    })
    if (seatedPlayers > 0) {
      throw new ForbiddenException(
        `Game ${id} has seated players, close or forfeit before deleting`,
      )
    }
    return this.prisma.$transaction(async (tx) => {
      // 行鎖取新值: 並發 join 的 bankroll increment / 開局轉 playing 會在此阻塞,
      // 消掉 stale-read race(對齊 closeGame)
      const [locked] = (await tx.$queryRaw`SELECT "bankroll", "status" FROM "Game" WHERE id = ${id} FOR UPDATE`) as [
        { bankroll: string | number; status: string },
      ]
      if (!locked) {
        throw new NotFoundException(`Game ${id} not found`)
      }
      if (locked.status === 'playing') {
        throw new ForbiddenException(
          `Game ${id} is playing, close or forfeit before deleting`,
        )
      }
      const seated = await tx.playerGame.count({
        where: { gameId: id, status: 'playing' },
      })
      if (seated > 0) {
        throw new ForbiddenException(
          `Game ${id} has seated players, close or forfeit before deleting`,
        )
      }
      // 先清子列再刪主列, 否則 FK 約束(Restrict)會 500
      await tx.playerGame.deleteMany({ where: { gameId: id } })
      await tx.gameHistory.deleteMany({ where: { gameId: id } })
      // wallet audit 列不刪: gameId 置空解除 FK, 資金軌跡完整保留(對齊 closeGame)
      await tx.transaction.updateMany({ where: { gameId: id }, data: { gameId: null } })
      // 用鎖後新值回流 house; bankroll 為 0 就跳過, 避免 bootstrap 零值 house 行
      const bankroll = new Decimal(locked.bankroll)
      if (bankroll.greaterThan(0)) {
        await this.house.houseMove(bankroll.toNumber(), tx)
      }
      await tx.game.delete({ where: { id } })
      return { message: 'Game deleted' }
    })
  }

  async closeGame(id: string) {
    // findOne 預檢是 tx 外 advisory(快速 404 / 409); 權威檢查與寫入全在 tx 內
    const game = await this.findOne(id)
    if (game.status === 'closed') {
      throw new ConflictException(`Game ${id} is already closed`)
    }
    return this.prisma.$transaction(async (tx) => {
      // 行鎖取新值: join 的 bankroll increment UPDATE 會在此阻塞, 消掉 stale-read race
      const [locked] = (await tx.$queryRaw`SELECT "bankroll", "status" FROM "Game" WHERE id = ${id} FOR UPDATE`) as [
        { bankroll: string | number; status: string },
      ]
      if (!locked) {
        throw new NotFoundException(`Game ${id} not found`)
      }
      if (locked.status === 'closed') {
        throw new ConflictException(`Game ${id} is already closed`)
      }
      const seatedPlayers = await tx.playerGame.count({
        where: { gameId: id, status: 'playing' },
      })
      if (seatedPlayers > 0) {
        throw new ConflictException('cannot close: players at table')
      }
      // 用鎖後新值回增; bankroll 為 0 就跳過, 避免 bootstrap 零值 house 行
      const bankroll = new Decimal(locked.bankroll)
      if (bankroll.greaterThan(0)) {
        await this.house.houseMove(bankroll.toNumber(), tx)
      }
      return tx.game.update({
        where: { id },
        data: { status: 'closed', bankroll: 0 },
      })
    })
  }

  async forceCloseGame(id: string) {
    // findOne 預檢是 tx 外 advisory(快速 404 / 409); 權威檢查與寫入全在 tx 內
    const game = await this.findOne(id)
    if (game.status === 'closed') {
      throw new ConflictException(`Game ${id} is already closed`)
    }
    // 與 join/remove 同 chain(key = join:${id}): 串行化避免與 in-flight join 交錯;
    // 行鎖仍是 tx 內權威守衛
    return this.enqueueGameAction(`join:${id}`, async () => {
      const result = await this.prisma.$transaction(async (tx) => {
        // 行鎖取新值: join 的 bankroll increment UPDATE 會在此阻塞, 消掉 stale-read race
        const [locked] = (await tx.$queryRaw`SELECT "bankroll", "status" FROM "Game" WHERE id = ${id} FOR UPDATE`) as [
          { bankroll: string | number; status: string },
        ]
        if (!locked) {
          throw new NotFoundException(`Game ${id} not found`)
        }
        if (locked.status === 'closed') {
          throw new ConflictException(`Game ${id} is already closed`)
        }
        // 全數 seated 強離: 標 forfeited 終態(buyIn 已在 bankroll, 不派彩);
        // waiting 桌無 playing 列時為 no-op
        const forfeitedCount = (
          await tx.playerGame.updateMany({
            where: { gameId: id, status: 'playing' },
            data: { status: 'forfeited' },
          })
        ).count
        // 用鎖後新值全數回流 house; bankroll 為 0 就跳過, 避免 bootstrap 零值 house 行
        const bankroll = new Decimal(locked.bankroll)
        const bankrollReturned = bankroll.greaterThan(0)
          ? bankroll.toNumber()
          : 0
        if (bankrollReturned > 0) {
          await this.house.houseMove(bankrollReturned, tx)
        }
        await tx.game.update({
          where: { id },
          data: { status: 'closed', bankroll: 0, pot: 0 },
        })
        return {
          success: true,
          status: 'closed',
          forfeitedCount,
          bankrollReturned,
        }
      })
      // 清 Redis state best-effort: 清不掉不阻塞, DB closed 是權威
      try {
        await this.redis.del(`game:${id}:state`)
      } catch (err) {
        this.logger.warn(
          `Failed to delete game state cache for game ${id}: ${err}`,
        )
      }
      return result
    })
  }

  async replenish(id: string, dto: ReplenishGameDto) {
    const game = await this.findOne(id)
    if (game.status === 'closed') {
      throw new ConflictException(`Game ${id} is already closed`)
    }
    return this.prisma.$transaction(async (tx) => {
      // 不足守衛在 houseMove 內(帶 gte 條件的原子 updateMany), 不足 throw 400
      await this.house.houseMove(-dto.amount, tx)
      // status 守衛是權威(併發 close 可能在預檢後發生), count=0 throw 回滾整筆
      const result = await tx.game.updateMany({
        where: { id, status: { not: 'closed' } },
        data: { bankroll: { increment: dto.amount } },
      })
      if (result.count === 0) {
        throw new ConflictException(`Game ${id} is already closed`)
      }
      return tx.game.findUnique({ where: { id } })
    })
  }

  /**
   * per-game queue 串行化: 同桌動作串同一條 chain。
   * key 只在 map 仍指向本次設入的 tail task 時才刪除——頭部任務的 finally
   * 若無條件 delete, 後方串鏈中的任務會失去互斥, 新請求可並行進入。
   * task 的 reject 照常 propagate 給呼叫端(catch 只用在存進 map 的那份)。
   */
  private enqueueGameAction<T>(
    queueKey: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const task = (
      this.gameActionQueues.get(queueKey) ?? Promise.resolve()
    ).then(fn)
    const stored = task.catch(() => undefined)
    this.gameActionQueues.set(queueKey, stored)
    return task.finally(() => {
      if (this.gameActionQueues.get(queueKey) === stored) {
        this.gameActionQueues.delete(queueKey)
      }
    })
  }

  async joinGame(gameId: string, userId: string) {
    return this.enqueueGameAction(`join:${gameId}`, () =>
      this._joinGameInternal(gameId, userId),
    )
  }

  private async _joinGameInternal(gameId: string, userId: string) {
    const game = await this.prisma.game.findUnique({ where: { id: gameId } })
    if (!game) {
      throw new NotFoundException(`Game ${gameId} not found`)
    }

    // 情境 1: 進行中 → 只接受純 reconnect, 不接受新玩家
    if (game.status === 'playing') {
      // 只認 'playing': forfeited 是終態, 離場者不可再 reconnect 回該輪
      const activeRow = await this.prisma.playerGame.findFirst({
        where: { gameId, playerId: userId, status: 'playing' },
      })
      if (!activeRow) {
        throw new ConflictException(
          '本局進行中,請等本局結束後再加入',
        )
      }
      // 純 reconnect: 不重複 placeBet、不建新列、bankroll 不動
      const cached = await this.redis.get(`game:${gameId}:state`)
      if (!cached) {
        throw new ServiceUnavailableException(
          `Game ${gameId} 的進行中狀態已遺失,請稍後重試或聯絡管理員`,
        )
      }
      const gameState = JSON.parse(cached) as GameState
      return { success: true, position: activeRow.position, gameState }
    }

    if (game.status !== 'waiting' && game.status !== 'completed') {
      throw new BadRequestException(
        `Game ${gameId} is not joinable (status: ${game.status})`,
      )
    }

    // 容量以當輪('playing')人數為準, 讓重用桌可再填滿;
    // forfeited 是終態, 不佔容量
    const activeCount = await this.prisma.playerGame.count({
      where: { gameId, status: 'playing' },
    })
    if (activeCount >= game.maxPlayers) {
      throw new BadRequestException(`Game ${gameId} is full`)
    }

    const existingRow = await this.prisma.playerGame.findFirst({
      where: { gameId, playerId: userId },
    })

    if (existingRow && existingRow.status === 'playing') {
      // 已入座當輪(桌未滿、尚未發牌)→ 冪等回傳, 不重複扣款
      const gameState = await this.getGameState(gameId)
      return { success: true, position: existingRow.position, gameState }
    }

    const position = activeCount
    // 扣款 → bankroll increment → 入座列三步必須同生共死: 收進單一外層 tx,
    // 中斷/重試不會留下「錢扣了但沒入座」的半態(double-charge 根源)
    await this.prisma.$transaction(async (tx) => {
      const updatedWallet = await this.wallet.placeBet(
        userId,
        gameId,
        game.buyIn,
        tx,
      )
      await tx.game.update({
        where: { id: gameId },
        data: { bankroll: { increment: game.buyIn } },
      })
      if (existingRow) {
        // 情境 2: 再入新輪次 → 重新扣款, UPDATE 原列(unique 約束不可 create 新列)
        await tx.playerGame.update({
          where: { id: existingRow.id },
          data: {
            status: 'playing',
            hand: [],
            balance: updatedWallet.balance.toNumber(),
            position,
          },
        })
      } else {
        // 情境 3: 新加入
        await tx.playerGame.create({
          data: {
            playerId: userId,
            gameId,
            balance: updatedWallet.balance.toNumber(),
            hand: [],
            status: 'playing',
            position,
          },
        })
      }
    })

    if (activeCount + 1 >= game.maxPlayers) {
      await this.startGame(gameId)
    }

    const gameState = await this.getGameState(gameId)
    return { success: true, position, gameState }
  }

  // D5: 玩家離場 forfeit。與 handleAction 共用同一把 per-game queue( key = gameId ),
  // 串行化避免與結算 race。
  // 依局狀態分語意:
  // - playing(局進行中): forfeited 終態, buyIn 沒入 bankroll(原 D5, 不動)。
  // - waiting / completed(局未開始): 退款 —— buyIn 原路退回 wallet(refund audit 列),
  //   bankroll −buyIn, 列標新終態 'refunded'(自由字串, 無 migration)。
  async forfeitGame(
    gameId: string,
    userId: string,
  ): Promise<{
    success: boolean
    forfeited: boolean
    refunded?: boolean
    tableStatus: string
    refundAmount?: number
    voided?: boolean
    gameState?: GameState
  }> {
    return this.enqueueGameAction(gameId, () =>
      this._forfeitGameInternal(gameId, userId),
    )
  }

  private async _forfeitGameInternal(gameId: string, userId: string) {
    const game = await this.prisma.game.findUnique({ where: { id: gameId } })
    if (!game) {
      throw new NotFoundException(`Game ${gameId} not found`)
    }
    // completed = 重用桌(上一輪已結算, 新輪次可能正被填座); 局未開始同样是
    // 合法 forfeit 情境(退款), 故接受
    if (
      game.status !== 'playing' &&
      game.status !== 'waiting' &&
      game.status !== 'completed'
    ) {
      throw new BadRequestException('Game is not in an active state')
    }

    // 只有當輪 'playing' 列可離場; completed / forfeited / refunded 皆為終態
    const activeRow = await this.prisma.playerGame.findFirst({
      where: { gameId, playerId: userId, status: 'playing' },
    })
    if (!activeRow) {
      throw new BadRequestException('No active seat to forfeit')
    }

    const stateKey = `game:${gameId}:state`
    // 先讀 state 再寫 DB: 重試語意一致(不會變成 400 No active seat)
    const cached = await this.redis.get(stateKey)

    if (game.status === 'waiting' || game.status === 'completed') {
      // 局未開始: 退款 buyIn。wallet 加回 + refund audit 列(含 balanceBefore/
      // balanceAfter, 對齊既有 audit 格式)、bankroll −buyIn、入座列新終態
      // 'refunded' 四寫同生共死於單一 tx, 中斷不留「退了款但 seat 還在」半態
      await this.prisma.$transaction(async (tx) => {
        await this.wallet.refundBuyIn(
          userId,
          gameId,
          game.buyIn,
          tx,
          'forfeit before game start',
        )
        await tx.game.update({
          where: { id: gameId },
          data: { bankroll: { decrement: game.buyIn } },
        })
        await tx.playerGame.update({
          where: { id: activeRow.id },
          data: { status: 'refunded' },
        })
      })
      // 尚未發牌, 正常沒有 state; 若存在殘留 state, 一併移除該玩家
      if (cached) {
        const state = JSON.parse(cached) as GameState
        state.players = state.players.filter((p) => p.userId !== userId)
        if (state.players.length > 0) {
          await this.setGameState(gameId, state)
        } else {
          await this.redis.del(stateKey)
        }
      }
      return {
        success: true,
        forfeited: false,
        refunded: true,
        tableStatus: game.status,
        refundAmount: game.buyIn,
      }
    }

    // playing: state 必須存在(在標記前檢查, 見上)
    if (!cached) {
      throw new ServiceUnavailableException(
        `Game ${gameId} 的進行中狀態已遺失,請稍後重試或聯絡管理員`,
      )
    }

    // 不動錢: buyIn 已在 bankroll, 不派彩, 只標終態
    await this.prisma.playerGame.update({
      where: { id: activeRow.id },
      data: { status: 'forfeited' },
    })

    const state = JSON.parse(cached) as GameState
    const playerIndex = state.players.findIndex((p) => p.userId === userId)
    if (playerIndex === -1) {
      // DB 列為權威, state 已無此座(異常殘留), 標記已生效
      return { success: true, forfeited: true, tableStatus: 'playing' }
    }
    state.players.splice(playerIndex, 1)

    if (state.players.length === 0) {
      // 本局 void: 不寫 GameHistory、不派彩, 桌回 waiting, 清 state, pot 歸零
      // (無進行中局); guard 寫入: 並行 close 已把桌轉成 closed 時 count=0, 不覆蓋回去
      const voidResult = await this.prisma.game.updateMany({
        where: { id: gameId, status: 'playing' },
        data: { status: 'waiting', updatedAt: new Date(), pot: 0 },
      })
      if (voidResult.count === 0) {
        // 已被並行 close/settle 改掉 status: 只清殘留 state, 照實回傳現況
        this.logger.warn(
          `Game ${gameId} forfeit void skipped: game status no longer 'playing' (parallel close/settle)`,
        )
        await this.redis.del(stateKey)
        const current = await this.prisma.game.findUnique({
          where: { id: gameId },
        })
        return {
          success: true,
          forfeited: true,
          tableStatus: current?.status ?? 'unknown',
          voided: true,
        }
      }
      await this.redis.del(stateKey)
      return { success: true, forfeited: true, tableStatus: 'waiting', voided: true }
    }

    const nextActiveIndex = state.players.findIndex(
      (p, i) => i >= playerIndex && p.status === 'playing',
    )
    if (nextActiveIndex === -1) {
      // 剩餘玩家皆已 stand/bust: 直接走莊家回合正常結算(照派彩、寫 history),
      // 不 void, 避免離場者吃掉其他玩家應得
      const finalState = await this.handleDealerTurn(gameId, state)
      return {
        success: true,
        forfeited: true,
        tableStatus: 'completed',
        voided: false,
        // in-memory 終態(含 dealerHand + results): 結算後 Redis 已清,
        // 呼叫端依此廣播 game:ended, 從 DB 重建會丟掉這兩樣(對齊 game:action)
        gameState: finalState,
      }
    }
    // 被移除者在指標上或指標之後 → 指標落到移除位置起的下一位 'playing'
    if (state.currentPlayerIndex >= playerIndex) {
      state.currentPlayerIndex = nextActiveIndex
    }

    await this.setGameState(gameId, state)
    return { success: true, forfeited: true, tableStatus: 'playing', voided: false }
  }

  private async startGame(gameId: string) {
    // 重用桌(上一輪已 completed)再填滿後也要能開局
    const result = await this.prisma.game.updateMany({
      where: { id: gameId, status: { in: ['waiting', 'completed'] } },
      data: { status: 'playing', updatedAt: new Date() },
    })
    if (result.count === 0) {
      this.logger.warn(
        `Game ${gameId} was already started by another request, skipping deal`,
      )
      return
    }

    const game = await this.prisma.game.findUnique({ where: { id: gameId } })
    if (!game) {
      this.logger.warn(
        `Game ${gameId} not found after status transition, skipping deal`,
      )
      return
    }

    // 只發牌給當輪玩家; 上一輪 completed / forfeited 列不参与開局
    const playerGames = await this.prisma.playerGame.findMany({
      where: { gameId, status: 'playing' },
      orderBy: { position: 'asc' },
    })

    const deck = new Deck(1)
    const players: PlayerState[] = []
    for (const playerGame of playerGames) {
      const hand: Card[] = [deck.drawCard(), deck.drawCard()]
      await this.prisma.playerGame.update({
        where: { id: playerGame.id },
        data: {
          hand: hand as unknown as Prisma.InputJsonValue,
          status: 'playing',
        },
      })
      players.push({
        id: playerGame.id,
        userId: playerGame.playerId,
        hand,
        status: 'playing',
        bet: game.buyIn,
        balance: playerGame.balance,
        position: playerGame.position,
      })
    }
    const dealerHand: Card[] = [deck.drawCard(), deck.drawCard()]

    // 單局 pot(Σbet)同步寫 DB: Redis state 是局中真相, DB pot 供
    // getGameState 的 DB 重建路徑讀到正確值; 沿用 join queue 串行化, 不新增 tx
    const pot = players.reduce((sum, player) => sum + player.bet, 0)
    await this.prisma.game.update({
      where: { id: gameId },
      data: { pot },
    })

    const gameState: GameState = {
      id: gameId,
      status: 'playing',
      players,
      dealerHand,
      pot,
      currentPlayerIndex: 0,
      deckCards: deck.getRemainingCards(),
    }
    await this.setGameState(gameId, gameState)
  }

  async handleAction(
    gameId: string,
    userId: string,
    action: string,
    betAmount?: number,
  ) {
    return this.enqueueGameAction(gameId, () =>
      this._handleActionInternal(gameId, userId, action, betAmount),
    )
  }

  private async _handleActionInternal(
    gameId: string,
    userId: string,
    action: string,
    betAmount?: number,
  ) {
    const gameState = await this.getGameState(gameId)
    const stateMachine = new GameStateMachine()

    if (!stateMachine.isValidAction(gameState, userId, action as GameAction)) {
      throw new BadRequestException(
        `Invalid action '${action}' for user ${userId} in game ${gameId}`,
      )
    }

    if (action === 'double') {
      const player = gameState.players.find((p) => p.userId === userId)
      if (!player) {
        throw new BadRequestException(
          `Player ${userId} not found in game ${gameId}`,
        )
      }
      // 同 join: 扣款與 bankroll increment 收進單一 tx, 不允許
      // 「錢扣了但 bankroll 沒進」的半態
      await this.prisma.$transaction(async (tx) => {
        await this.wallet.placeBet(userId, gameId, player.bet, tx)
        await tx.game.update({
          where: { id: gameId },
          data: { bankroll: { increment: player.bet } },
        })
      })
    }

    let drawnCard: Card | undefined
    if (action === 'hit' || action === 'double') {
      let deck: Deck
      if (gameState.deckCards.length >= 10) {
        deck = Deck.fromCards(gameState.deckCards)
      } else {
        this.logger.warn(
          `Game ${gameId}: only ${gameState.deckCards.length} cards left in deck, reshuffling a new deck`,
        )
        deck = new Deck(1)
      }
      drawnCard = deck.drawCard()
      gameState.deckCards = deck.getRemainingCards()
    }

    const newState = stateMachine.processAction(
      gameState,
      userId,
      action as GameAction,
      drawnCard,
    )

    if (newState.status === 'dealer-turn') {
      const finalState = await this.handleDealerTurn(gameId, newState)
      return { success: true, gameState: finalState }
    }

    await this.setGameState(gameId, newState)
    return { success: true, gameState: newState }
  }

  private async handleDealerTurn(
    gameId: string,
    gameState: GameState,
  ): Promise<GameState> {
    const blackjackEngine = new BlackjackEngine()

    while (blackjackEngine.shouldDealerHit({ cards: gameState.dealerHand })) {
      let deck: Deck
      if (gameState.deckCards.length >= 10) {
        deck = Deck.fromCards(gameState.deckCards)
      } else {
        this.logger.warn(
          `Game ${gameId}: only ${gameState.deckCards.length} cards left in deck during dealer turn, reshuffling a new deck`,
        )
        deck = new Deck(1)
      }
      const card = deck.drawCard()
      gameState.dealerHand.push(card)
      gameState.deckCards = deck.getRemainingCards()
    }

    const results: GameResult[] = gameState.players.map((player) => {
      const playerHand = { cards: player.hand }
      const dealerHand = { cards: gameState.dealerHand }
      const outcome = blackjackEngine.determineWinner(playerHand, dealerHand)
      if (outcome === 'push') {
        return {
          userId: player.userId,
          result: 'push' as const,
          payout: player.bet,
        }
      }
      if (outcome === 'player') {
        const isBlackjack = blackjackEngine.evaluateHand(playerHand).isBlackjack
        const payout = isBlackjack ? Math.floor(player.bet * 1.5) : player.bet
        return { userId: player.userId, result: 'win' as const, payout }
      }
      return { userId: player.userId, result: 'loss' as const, payout: 0 }
    })

    for (const player of gameState.players) {
      player.status = 'completed'
    }
    gameState.status = 'completed'
    gameState.results = results

    const canSettle = await this.persistGameResult(gameId, gameState)
    if (!canSettle) {
      this.logger.warn(
        `Game ${gameId} was already settled by another process, skipping payout`,
      )
      return gameState
    }

    try {
      await this.wallet.payoutGameResults(
        gameId,
        results.map((r) => ({
          playerId: r.userId,
          result: r.result,
          payout: r.payout,
        })),
      )
    } catch (err) {
      this.logger.error(
        'CRITICAL: payout failed, manual reconciliation needed',
        err,
      )
      throw err
    }

    try {
      await this.redis.del(`game:${gameId}:state`)
    } catch (err) {
      this.logger.warn(
        `Failed to delete game state cache for game ${gameId}: ${err}`,
      )
    }

    return gameState
  }

  private async persistGameResult(
    gameId: string,
    gameState: GameState,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      // 結算只可能合法地從 playing 進入: waiting/completed/closed 全走 count=0 skip
      // (closed 桌的 in-flight 結算或 stale Redis state 不可對已回流 house 的 bankroll 派彩)
      const updateResult = await tx.game.updateMany({
        where: { id: gameId, status: 'playing' },
        data: { status: 'completed', updatedAt: new Date() },
      })
      if (updateResult.count === 0) {
        return false
      }

      const results = gameState.results ?? []
      // D2 錢流: 結算時桌籌碼池扣回 payoutWin 合計。結算狀態已需提交,
      // 不新增 throwing 守衛;病態負值照實寫入, 不 clamp(SA 決策)。
      await tx.game.update({
        where: { id: gameId },
        data: {
          bankroll: {
            decrement: results.reduce((sum, r) => sum + r.payout, 0),
          },
        },
      })

      // 結算完單局 pot 歸零: DB 重建路徑不可殘留已結算局的 pot
      await tx.game.update({
        where: { id: gameId },
        data: { pot: 0 },
      })

      // 只更新 state.players 內的玩家: forfeited 玩家在 forfeit 時即被移出
      // state.players, 不會被此處改回 completed(終態保持)
      for (const player of gameState.players) {
        const result = results.find((r) => r.userId === player.userId)
        await tx.playerGame.update({
          where: { id: player.id },
          data: {
            hand: player.hand as unknown as Prisma.InputJsonValue,
            status: 'completed',
            balance: player.balance,
          },
        })
        await tx.gameHistory.create({
          data: {
            gameId,
            winnerId: result?.result === 'win' ? player.userId : null,
            payout: result?.payout ?? 0,
            timestamp: new Date(),
          },
        })
      }
      return true
    })
  }

  private async getGameState(gameId: string): Promise<GameState> {
    try {
      const cached = await this.redis.get(`game:${gameId}:state`)
      if (cached) {
        const state = JSON.parse(cached) as GameState
        // 只含當輪玩家, 避免 completed 殘留進入 state 與 payout 目標
        state.players = state.players.filter((p) => p.status !== 'completed')
        return state
      }
    } catch (err) {
      this.logger.warn(
        `Failed to read game state cache for game ${gameId}: ${err}`,
      )
    }

    this.logger.warn(
      `No cached game state for game ${gameId}, rebuilding from database (deckCards is empty, next draw will reshuffle)`,
    )
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: { players: { where: { status: 'playing' } } },
    })
    if (!game) {
      throw new NotFoundException(`Game ${gameId} not found`)
    }

    const players: PlayerState[] = game.players
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((playerGame) => ({
        id: playerGame.id,
        userId: playerGame.playerId,
        hand: (playerGame.hand as unknown as Card[]) ?? [],
        status: playerGame.status as PlayerState['status'],
        bet: game.buyIn,
        balance: playerGame.balance,
        position: playerGame.position,
      }))

    return {
      id: gameId,
      status: game.status as GameState['status'],
      players,
      dealerHand: [],
      pot: game.pot,
      currentPlayerIndex: 0,
      deckCards: [],
    }
  }

  private async setGameState(gameId: string, state: GameState): Promise<void> {
    try {
      await this.redis.set(`game:${gameId}:state`, JSON.stringify(state), 7200)
    } catch (err) {
      this.logger.warn(
        `Failed to write game state cache for game ${gameId}: ${err}`,
      )
    }
  }

  /**
   * 建立已遮蔽的 BroadcastState(不含 deckCards, 莊家暗牌依 status 遮蔽)。
   * - 傳入 stateOverride(非空的 in-memory GameState)時直接用它, 不讀 Redis/DB;
   *   用於結算瞬間: Redis 已被 del, 從 DB 重建會丟掉 dealerHand/results。
   * - 未傳時走原本的 Redis 快取 / DB 重建邏輯。
   */
  async getBroadcastState(
    gameId: string,
    stateOverride?: GameState,
  ): Promise<BroadcastState | null> {
    let state: GameState
    if (stateOverride) {
      state = stateOverride
    } else {
      try {
        state = await this.getGameState(gameId)
      } catch (err) {
        if (err instanceof NotFoundException) {
          return null
        }
        throw err
      }
    }

    return this.toBroadcastState(state)
  }

  private async toBroadcastState(state: GameState): Promise<BroadcastState> {
    const userIds = state.players.map((player) => player.userId)
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true },
    })
    const usernameById = new Map(users.map((user) => [user.id, user.username]))

    const players: PlayerEntry[] = state.players.map((player) => ({
      userId: player.userId,
      username: usernameById.get(player.userId) ?? '',
      hand: player.hand.map((card) => this.toPlayingCard(card)),
      bet: player.bet,
      status: this.toPlayerEntryStatus(player.status),
      score: this.evaluateHandScore(player.hand),
    }))

    const status = this.toBroadcastStatus(state.status)
    // 莊家翻牌前隱藏暗牌: 只送開牌(upcard = dealerHand[0]), 暗牌(dealerHand[1])不外流
    const visibleDealerHand =
      status === 'dealer-turn' || status === 'completed'
        ? state.dealerHand
        : state.dealerHand.slice(0, 1)
    const broadcast: BroadcastState = {
      status,
      pot: state.pot,
      dealerHand: visibleDealerHand.map((card) => this.toPlayingCard(card)),
      currentPlayerIndex:
        status === 'completed' ? -1 : state.currentPlayerIndex,
      players,
    }

    if (state.results) {
      broadcast.results = state.results.map((result) => ({
        userId: result.userId,
        won: result.result === 'win',
        payout: result.payout,
        reason: result.result,
      }))
    }

    return broadcast
  }

  private toPlayingCard(card: Card): PlayingCard {
    return {
      card: `${card.rank}${card.suit}`,
      suit: card.suit,
      value: card.value,
      rank: RANK_TO_NUMBER[card.rank],
    }
  }

  private toBroadcastStatus(
    status: GameState['status'],
  ): BroadcastState['status'] {
    switch (status) {
      case 'waiting':
        return 'waiting'
      case 'playing':
        return 'player-turn'
      case 'dealer-turn':
        return 'dealer-turn'
      case 'completed':
        return 'completed'
      default:
        return 'waiting'
    }
  }

  private toPlayerEntryStatus(
    status: PlayerState['status'],
  ): PlayerEntry['status'] {
    switch (status) {
      case 'playing':
        return 'playing'
      case 'stand':
        return 'stand'
      case 'bust':
        return 'bust'
      default:
        return 'settled'
    }
  }

  private evaluateHandScore(hand: Card[]): number {
    return new BlackjackEngine().evaluateHand({ cards: hand }).value
  }
}
