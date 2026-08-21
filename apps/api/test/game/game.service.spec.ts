import { BadRequestException, ConflictException } from '@nestjs/common'
import { GameService } from '../../src/game/game.service'
import {
  GameState,
  PlayerState,
} from '../../src/game/interfaces/game-state.interface'
import { Card } from '../../src/game/engines/card-deck'

describe('GameService', () => {
  const GAME_ID = 'game-1'
  const MY_USER = 'user-1'
  const OTHER_USER = 'user-2'

  let service: GameService
  let prismaMock: any
  let walletMock: any
  let redisMock: any
  let houseMock: any

  const createCard = (rank: string, value: number): Card => ({
    suit: '♠',
    rank: rank as any,
    value,
  })

  const createFullDeck = (): Card[] => {
    const suits: Card['suit'][] = ['♠', '♥', '♦', '♣']
    const ranks: Array<{ rank: Card['rank']; value: number }> = [
      { rank: 'A', value: 1 },
      { rank: '2', value: 2 },
      { rank: '3', value: 3 },
      { rank: '4', value: 4 },
      { rank: '5', value: 5 },
      { rank: '6', value: 6 },
      { rank: '7', value: 7 },
      { rank: '8', value: 8 },
      { rank: '9', value: 9 },
      { rank: '10', value: 10 },
      { rank: 'J', value: 10 },
      { rank: 'Q', value: 10 },
      { rank: 'K', value: 10 },
    ]
    const cards: Card[] = []
    for (const suit of suits) {
      for (const { rank, value } of ranks) {
        cards.push({ suit, rank, value })
      }
    }
    return cards
  }

  const createPlayer = (userId: string, position: number): PlayerState => ({
    id: `player-${userId}`,
    userId,
    hand: [createCard('K', 10), createCard('5', 5)],
    status: 'playing',
    bet: 100,
    balance: 2050,
    position,
  })

  const createGameState = (): GameState => ({
    id: GAME_ID,
    status: 'playing',
    players: [createPlayer(MY_USER, 0), createPlayer(OTHER_USER, 1)],
    dealerHand: [createCard('K', 10)],
    pot: 200,
    currentPlayerIndex: 0,
    deckCards: createFullDeck(),
  })

  beforeEach(() => {
    prismaMock = {
      game: { update: jest.fn().mockResolvedValue({}) },
    }
    walletMock = {
      placeBet: jest.fn().mockResolvedValue({}),
      payoutGameResults: jest.fn(),
    }
    redisMock = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
    }
    houseMock = {
      houseBalance: jest.fn().mockResolvedValue(0),
      houseMove: jest.fn().mockResolvedValue(0),
    }

    service = new GameService(prismaMock, walletMock, redisMock, houseMock)
  })

  describe('handleAction', () => {
    it('double: charges the wallet the pre-double bet and doubles the bet', async () => {
      const state = createGameState()
      redisMock.get.mockResolvedValue(JSON.stringify(state))

      const result = await service.handleAction(GAME_ID, MY_USER, 'double')

      expect(walletMock.placeBet).toHaveBeenCalledTimes(1)
      expect(walletMock.placeBet).toHaveBeenCalledWith(MY_USER, GAME_ID, 100)
      expect(result.gameState.players[0].bet).toBe(200)
    })

    it('double: rejects and leaves state untouched when the wallet cannot cover', async () => {
      const state = createGameState()
      const serialized = JSON.stringify(state)
      redisMock.get.mockResolvedValue(serialized)
      walletMock.placeBet.mockRejectedValue(
        new BadRequestException('Insufficient balance'),
      )

      await expect(
        service.handleAction(GAME_ID, MY_USER, 'double'),
      ).rejects.toThrow(BadRequestException)

      // 狀態未被持久化：沒有抽牌、沒有寫回 redis
      expect(walletMock.placeBet).toHaveBeenCalledWith(MY_USER, GAME_ID, 100)
      expect(redisMock.set).not.toHaveBeenCalled()
      expect(JSON.parse(serialized).players[0].hand).toHaveLength(2)
    })

    it('hit: never touches the wallet and appends the drawn card', async () => {
      const state = createGameState()
      redisMock.get.mockResolvedValue(JSON.stringify(state))

      const result = await service.handleAction(GAME_ID, MY_USER, 'hit')

      expect(walletMock.placeBet).not.toHaveBeenCalled()
      expect(redisMock.set).toHaveBeenCalled()
      expect(result.gameState.players[0].hand).toHaveLength(3)
    })

    it('stand: never touches the wallet', async () => {
      const state = createGameState()
      redisMock.get.mockResolvedValue(JSON.stringify(state))

      const result = await service.handleAction(GAME_ID, MY_USER, 'stand')

      expect(walletMock.placeBet).not.toHaveBeenCalled()
      expect(result.gameState.players[0].status).toBe('stand')
      expect(redisMock.set).toHaveBeenCalled()
    })
  })

  describe('getBroadcastState', () => {
    const createBroadcastState = (
      status: GameState['status'],
      dealerCards: Card[] = [createCard('K', 10), createCard('7', 7)],
    ): GameState => ({
      id: GAME_ID,
      status,
      players: [createPlayer(MY_USER, 0)],
      dealerHand: dealerCards,
      pot: 100,
      currentPlayerIndex: 0,
      deckCards: createFullDeck(),
    })

    const stub = (state: GameState) => {
      redisMock.get.mockResolvedValue(JSON.stringify(state))
      prismaMock.user = {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: MY_USER, username: 'player-one' }]),
      }
    }

    it('player-turn: 莊家翻牌前暗牌不外流, 只送開牌(upcard)一張', async () => {
      stub(createBroadcastState('playing'))

      // state 已 stub 且 game 存在, 不會回傳 null
      const broadcast = (await service.getBroadcastState(GAME_ID))!

      expect(broadcast.status).toBe('player-turn')
      // 安全意圖: 若翻牌前暗牌外流, 玩家直接看到莊家第二張, 黑傑克判定失衡
      expect(broadcast.dealerHand).toHaveLength(1)
      expect(broadcast.dealerHand[0].card).toBe('K♠')
    })

    it('waiting: 尚未發牌時 dealerHand 送空陣列', async () => {
      stub(createBroadcastState('waiting', []))

      const broadcast = (await service.getBroadcastState(GAME_ID))!

      expect(broadcast.status).toBe('waiting')
      expect(broadcast.dealerHand).toHaveLength(0)
    })

    it('dealer-turn: 莊家開始出牌後暗牌揭示, 送完整兩張', async () => {
      stub(createBroadcastState('dealer-turn'))

      const broadcast = (await service.getBroadcastState(GAME_ID))!

      expect(broadcast.status).toBe('dealer-turn')
      expect(broadcast.dealerHand).toHaveLength(2)
      expect(broadcast.dealerHand.map((c) => c.card)).toEqual(['K♠', '7♠'])
    })

    it('completed: 結算後 dealerHand 維持完整兩張', async () => {
      stub(createBroadcastState('completed'))

      const broadcast = (await service.getBroadcastState(GAME_ID))!

      expect(broadcast.status).toBe('completed')
      expect(broadcast.dealerHand).toHaveLength(2)
    })

    it('completed + stateOverride: 最終一局的 in-memory 狀態回傳完整 dealerHand(2 張)+ results, 且不從已清除的 Redis 重建 (B1 回歸防禦)', async () => {
      // 結算後 handleDealerTurn 會 redis.del('game:<id>:state'),
      // 此時若走 Redis/DB 路徑, 重建出的 dealerHand 是空的、沒有 results
      redisMock.get.mockResolvedValue(null)
      prismaMock.user = {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: MY_USER, username: 'player-one' }]),
      }

      const finalState: GameState = {
        ...createBroadcastState('completed'),
        results: [{ userId: MY_USER, result: 'win', payout: 150 }],
      }

      const broadcast = await service.getBroadcastState(GAME_ID, finalState)

      expect(broadcast).not.toBeNull()
      // 玩家收到的最後一筆廣播必須带完整莊家牌與派彩, 否則前端顯示 "No cards dealt yet" 且沒有 You won/lost
      expect(broadcast!.status).toBe('completed')
      expect(broadcast!.dealerHand).toHaveLength(2)
      expect(broadcast!.dealerHand.map((c) => c.card)).toEqual(['K♠', '7♠'])
      expect(broadcast!.results).toHaveLength(1)
      expect(broadcast!.results![0]).toEqual({
        userId: MY_USER,
        won: true,
        payout: 150,
        reason: 'win',
      })
      // username 查詢在 override 路徑也要做
      expect(broadcast!.players[0].username).toBe('player-one')
      // 廣播永不外露整副剩餘牌序 / raw GameState
      expect((broadcast as { deckCards?: unknown }).deckCards).toBeUndefined()
      // 證據: override 短路, 沒有碰 Redis
      expect(redisMock.get).not.toHaveBeenCalled()
    })

    it('player-turn + stateOverride: 暗牌遮蔽邏輯一樣成立, 只送一張開牌 (B2 遮蔽防禦)', async () => {
      redisMock.get.mockResolvedValue(null)
      prismaMock.user = {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: MY_USER, username: 'player-one' }]),
      }

      // in-memory 狀態裡莊家已有兩張牌, 翻牌前只該送第一張
      const midState = createBroadcastState('playing')
      expect(midState.dealerHand).toHaveLength(2)

      const broadcast = await service.getBroadcastState(GAME_ID, midState)

      expect(broadcast!.status).toBe('player-turn')
      expect(broadcast!.dealerHand).toHaveLength(1)
      expect(broadcast!.dealerHand[0].card).toBe('K♠')
      expect((broadcast as { deckCards?: unknown }).deckCards).toBeUndefined()
      expect(redisMock.get).not.toHaveBeenCalled()
    })
  })

  describe('create', () => {
    it('house 不足 → reject, tx.game.create 不被呼叫', async () => {
      houseMock.houseMove.mockRejectedValue(
        new BadRequestException('house pool insufficient'),
      )
      let txMock: any
      prismaMock.$transaction = jest.fn(
        async (fn: (tx: any) => Promise<unknown>) =>
          fn(
            (txMock = {
              game: { create: jest.fn().mockResolvedValue({ id: GAME_ID }) },
            }),
          ),
      )

      await expect(
        service.create({ type: 'blackjack', maxPlayers: 2, buyIn: 100 }),
      ).rejects.toThrow(BadRequestException)

      // 扣款意圖: bankroll = maxPlayers * buyIn = 200, 方向為負
      expect(houseMock.houseMove).toHaveBeenCalledWith(-200, txMock)
      expect(txMock.game.create).not.toHaveBeenCalled()
    })
  })

  describe('closeGame', () => {
    it('tx 內行鎖發現已 closed → reject 409, 不做回增與寫入(消 stale-read race)', async () => {
      // 外部預檢讀到的是舊值(waiting), 鎖後的新值才是 closed
      prismaMock.game.findUnique = jest.fn().mockResolvedValue({
        id: GAME_ID,
        status: 'waiting',
        bankroll: 300,
      })
      let txMock: any
      prismaMock.$transaction = jest.fn(
        async (fn: (tx: any) => Promise<unknown>) =>
          fn(
            (txMock = {
              $queryRaw: jest.fn().mockResolvedValue([
                { bankroll: 0, status: 'closed' },
              ]),
              playerGame: { count: jest.fn().mockResolvedValue(0) },
              game: { update: jest.fn().mockResolvedValue({}) },
            }),
          ),
      )

      await expect(service.closeGame(GAME_ID)).rejects.toThrow(ConflictException)

      // 意圖: 已閉桌不可再回增一次 bankroll(house 會被重複加)
      expect(houseMock.houseMove).not.toHaveBeenCalled()
      expect(txMock.game.update).not.toHaveBeenCalled()
    })
  })

  describe('replenish', () => {
    it('house 不足 → reject 400, tx.game.updateMany 不被呼叫(整筆回滾)', async () => {
      prismaMock.game.findUnique = jest.fn().mockResolvedValue({
        id: GAME_ID,
        status: 'waiting',
      })
      houseMock.houseMove.mockRejectedValue(
        new BadRequestException('house pool insufficient'),
      )
      let txMock: any
      prismaMock.$transaction = jest.fn(
        async (fn: (tx: any) => Promise<unknown>) =>
          fn(
            (txMock = {
              game: {
                updateMany: jest.fn().mockResolvedValue({ count: 1 }),
                findUnique: jest.fn(),
              },
            }),
          ),
      )

      await expect(
        service.replenish(GAME_ID, { amount: 100 }),
      ).rejects.toThrow(BadRequestException)

      // 扣款意圖: 方向為負
      expect(houseMock.houseMove).toHaveBeenCalledWith(-100, txMock)
      // houseMove throw 後 bankroll 不可被寫入
      expect(txMock.game.updateMany).not.toHaveBeenCalled()
    })
  })

  describe('persistGameResult', () => {
    it('結算: bankroll 以 decrement 扣回 payout 總和(原子相對寫, 非絕對值寫回)', async () => {
      const state = createGameState()
      state.status = 'completed'
      state.results = [
        { userId: MY_USER, result: 'win', payout: 150 },
        { userId: OTHER_USER, result: 'win', payout: 100 },
      ]

      const txMock = {
        game: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          update: jest.fn().mockResolvedValue({}),
        },
        playerGame: { update: jest.fn().mockResolvedValue({}) },
        gameHistory: { create: jest.fn().mockResolvedValue({}) },
      }
      prismaMock.$transaction = jest.fn(
        async (fn: (tx: any) => Promise<unknown>) => fn(txMock),
      )

      const canSettle = await (service as any).persistGameResult(
        GAME_ID,
        state,
      )

      expect(canSettle).toBe(true)
      // 意圖: 結算扣款必須是原子相對 decrement(Σ payout = 250),
      // 絕對值寫回會覆蓋並發入款(double-in 等)造成的 increment
      expect(txMock.game.update).toHaveBeenCalledWith({
        where: { id: GAME_ID },
        data: { bankroll: { decrement: 250 } },
      })
    })
  })
})
