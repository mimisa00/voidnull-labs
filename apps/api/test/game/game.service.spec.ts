import { BadRequestException } from '@nestjs/common'
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
    prismaMock = {}
    walletMock = {
      placeBet: jest.fn().mockResolvedValue({}),
      payoutGameResults: jest.fn(),
    }
    redisMock = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
    }

    service = new GameService(prismaMock, walletMock, redisMock)
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
})
