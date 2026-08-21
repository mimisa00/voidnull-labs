import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
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
      return tx.game.create({
        data: { ...dto, bankroll, status: 'waiting', pot: 0 },
      })
    })
  }

  async update(id: string, dto: UpdateGameDto) {
    await this.findOne(id)
    return this.prisma.game.update({ where: { id }, data: dto })
  }

  async remove(id: string) {
    await this.findOne(id)
    await this.prisma.game.delete({ where: { id } })
    return { message: 'Game deleted' }
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

  async joinGame(gameId: string, userId: string) {
    const queueKey = `join:${gameId}`
    const task = (
      this.gameActionQueues.get(queueKey) ?? Promise.resolve()
    ).then(() => this._joinGameInternal(gameId, userId))
    this.gameActionQueues.set(
      queueKey,
      task.catch(() => undefined),
    )
    return task.finally(() => {
      this.gameActionQueues.delete(queueKey)
    })
  }

  private async _joinGameInternal(gameId: string, userId: string) {
    const game = await this.prisma.game.findUnique({ where: { id: gameId } })
    if (!game || game.status !== 'waiting') {
      throw new BadRequestException(`Game ${gameId} is not in waiting status`)
    }

    const playerCount = await this.prisma.playerGame.count({
      where: { gameId },
    })
    if (playerCount >= game.maxPlayers) {
      throw new BadRequestException(`Game ${gameId} is full`)
    }

    const existingPlayer = await this.prisma.playerGame.findFirst({
      where: { gameId, playerId: userId },
    })
    if (existingPlayer) {
      throw new ConflictException(
        `User ${userId} has already joined game ${gameId}`,
      )
    }

    const updatedWallet = await this.wallet.placeBet(userId, gameId, game.buyIn)

    await this.prisma.game.update({
      where: { id: gameId },
      data: { bankroll: { increment: game.buyIn } },
    })

    const position = playerCount
    await this.prisma.playerGame.create({
      data: {
        playerId: userId,
        gameId,
        balance: updatedWallet.balance.toNumber(),
        hand: [],
        status: 'playing',
        position,
      },
    })

    if (playerCount + 1 >= game.maxPlayers) {
      await this.startGame(gameId)
    }

    const gameState = await this.getGameState(gameId)
    return { success: true, position, gameState }
  }

  private async startGame(gameId: string) {
    const result = await this.prisma.game.updateMany({
      where: { id: gameId, status: 'waiting' },
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

    const playerGames = await this.prisma.playerGame.findMany({
      where: { gameId },
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

    const gameState: GameState = {
      id: gameId,
      status: 'playing',
      players,
      dealerHand,
      pot: players.reduce((sum, player) => sum + player.bet, 0),
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
    const queueKey = gameId
    const task = (
      this.gameActionQueues.get(queueKey) ?? Promise.resolve()
    ).then(() => this._handleActionInternal(gameId, userId, action, betAmount))
    this.gameActionQueues.set(
      queueKey,
      task.catch(() => undefined),
    )
    return task.finally(() => {
      this.gameActionQueues.delete(queueKey)
    })
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
      await this.wallet.placeBet(userId, gameId, player.bet)
      await this.prisma.game.update({
        where: { id: gameId },
        data: { bankroll: { increment: player.bet } },
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
      const updateResult = await tx.game.updateMany({
        where: { id: gameId, status: { not: 'completed' } },
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
        return JSON.parse(cached) as GameState
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
      include: { players: true },
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
