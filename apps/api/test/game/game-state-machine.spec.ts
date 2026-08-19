import { GameStateMachine } from '../../src/game/game-state-machine'
import {
  GameState,
  PlayerState,
} from '../../src/game/interfaces/game-state.interface'
import { Card } from '../../src/game/engines/card-deck'

describe('GameStateMachine', () => {
  let stateMachine: GameStateMachine

  beforeEach(() => {
    stateMachine = new GameStateMachine()
  })

  const createMockCard = (rank: string, value: number): Card => ({
    suit: '♠',
    rank: rank as any,
    value,
  })

  const createMockPlayer = (
    userId: string,
    status: 'playing' | 'stand' | 'bust' | 'completed' = 'playing',
    balance: number = 900,
    bet: number = 100,
  ): PlayerState => ({
    id: `player-${userId}`,
    userId,
    hand: [createMockCard('K', 10), createMockCard('5', 5)],
    status,
    bet,
    balance,
    position: 0,
  })

  const createMockGameState = (
    players: PlayerState[],
    status: 'waiting' | 'playing' | 'dealer-turn' | 'completed' = 'playing',
    currentPlayerIndex: number = 0,
  ): GameState => ({
    id: 'game-1',
    status,
    players,
    dealerHand: [createMockCard('K', 10)],
    pot: 200,
    currentPlayerIndex,
    deckCards: [],
  })

  describe('isValidAction', () => {
    it('should return true for hit when it is the player turn and player is playing', () => {
      const player = createMockPlayer('user-1')
      const gameState = createMockGameState([player], 'playing', 0)

      const result = stateMachine.isValidAction(gameState, 'user-1', 'hit')

      expect(result).toBe(true)
    })

    it('should return false for hit when it is not the player turn', () => {
      const player1 = createMockPlayer('user-1')
      const player2 = createMockPlayer('user-2')
      const gameState = createMockGameState([player1, player2], 'playing', 0)

      const result = stateMachine.isValidAction(gameState, 'user-2', 'hit')

      expect(result).toBe(false)
    })

    it('should return false for hit when game is not in playing status', () => {
      const player = createMockPlayer('user-1')
      const gameState = createMockGameState([player], 'dealer-turn', 0)

      const result = stateMachine.isValidAction(gameState, 'user-1', 'hit')

      expect(result).toBe(false)
    })

    it('should return false for hit when player is not in playing status', () => {
      const player = createMockPlayer('user-1', 'stand')
      const gameState = createMockGameState([player], 'playing', 0)

      const result = stateMachine.isValidAction(gameState, 'user-1', 'hit')

      expect(result).toBe(false)
    })

    it('should return true for stand when it is the player turn', () => {
      const player = createMockPlayer('user-1')
      const gameState = createMockGameState([player], 'playing', 0)

      const result = stateMachine.isValidAction(gameState, 'user-1', 'stand')

      expect(result).toBe(true)
    })

    it('should return false for stand when it is not the player turn', () => {
      const player1 = createMockPlayer('user-1')
      const player2 = createMockPlayer('user-2')
      const gameState = createMockGameState([player1, player2], 'playing', 0)

      const result = stateMachine.isValidAction(gameState, 'user-2', 'stand')

      expect(result).toBe(false)
    })

    it('should return true for double when it is the player turn', () => {
      const player = createMockPlayer('user-1')
      const gameState = createMockGameState([player], 'playing', 0)

      const result = stateMachine.isValidAction(gameState, 'user-1', 'double')

      expect(result).toBe(true)
    })

    it('should return false for double when it is not the player turn', () => {
      const player1 = createMockPlayer('user-1')
      const player2 = createMockPlayer('user-2')
      const gameState = createMockGameState([player1, player2], 'playing', 0)

      const result = stateMachine.isValidAction(gameState, 'user-2', 'double')

      expect(result).toBe(false)
    })

    it('should return true for split when it is the player turn (not yet restricted)', () => {
      const player = createMockPlayer('user-1')
      const gameState = createMockGameState([player], 'playing', 0)

      const result = stateMachine.isValidAction(gameState, 'user-1', 'split')

      expect(result).toBe(true)
    })

    it('should return false when player does not exist in game', () => {
      const player = createMockPlayer('user-1')
      const gameState = createMockGameState([player], 'playing', 0)

      const result = stateMachine.isValidAction(gameState, 'user-2', 'hit')

      expect(result).toBe(false)
    })
  })

  describe('processAction', () => {
    describe('hit action', () => {
      it('should add card to player hand', () => {
        const player = createMockPlayer('user-1')
        const gameState = createMockGameState([player], 'playing', 0)
        const newCard = createMockCard('5', 5)

        const result = stateMachine.processAction(
          gameState,
          'user-1',
          'hit',
          newCard,
        )

        expect(result.players[0].hand).toHaveLength(3)
        expect(result.players[0].hand[2]).toEqual(newCard)
      })

      it('should set player status to bust when hand exceeds 21', () => {
        const player = createMockPlayer('user-1')
        player.hand = [createMockCard('K', 10), createMockCard('Q', 10)]
        const gameState = createMockGameState([player], 'playing', 0)
        const bustCard = createMockCard('5', 5)

        const result = stateMachine.processAction(
          gameState,
          'user-1',
          'hit',
          bustCard,
        )

        expect(result.players[0].status).toBe('bust')
      })

      it('should move to next player when current player does not bust', () => {
        const player1 = createMockPlayer('user-1')
        const player2 = createMockPlayer('user-2')
        const gameState = createMockGameState([player1, player2], 'playing', 0)
        const newCard = createMockCard('2', 2)

        const result = stateMachine.processAction(
          gameState,
          'user-1',
          'hit',
          newCard,
        )

        expect(result.currentPlayerIndex).toBe(1)
      })

      it('should transition to dealer-turn when all players are done', () => {
        const player = createMockPlayer('user-1')
        const gameState = createMockGameState([player], 'playing', 0)
        const newCard = createMockCard('2', 2)

        const result = stateMachine.processAction(
          gameState,
          'user-1',
          'hit',
          newCard,
        )

        expect(result.status).toBe('dealer-turn')
      })
    })

    describe('stand action', () => {
      it('should set player status to stand', () => {
        const player = createMockPlayer('user-1')
        const gameState = createMockGameState([player], 'playing', 0)

        const result = stateMachine.processAction(gameState, 'user-1', 'stand')

        expect(result.players[0].status).toBe('stand')
      })

      it('should move to next player after stand', () => {
        const player1 = createMockPlayer('user-1')
        const player2 = createMockPlayer('user-2')
        const gameState = createMockGameState([player1, player2], 'playing', 0)

        const result = stateMachine.processAction(gameState, 'user-1', 'stand')

        expect(result.currentPlayerIndex).toBe(1)
      })

      it('should transition to dealer-turn when all players stand', () => {
        const player = createMockPlayer('user-1')
        const gameState = createMockGameState([player], 'playing', 0)

        const result = stateMachine.processAction(gameState, 'user-1', 'stand')

        expect(result.status).toBe('dealer-turn')
      })

      it('should skip players with non-playing status when moving to next player', () => {
        const player1 = createMockPlayer('user-1')
        const player2 = createMockPlayer('user-2', 'bust')
        const player3 = createMockPlayer('user-3')
        const gameState = createMockGameState(
          [player1, player2, player3],
          'playing',
          0,
        )

        const result = stateMachine.processAction(gameState, 'user-1', 'stand')

        expect(result.currentPlayerIndex).toBe(2)
      })
    })

    describe('double action', () => {
      it('should double the bet and deduct additional bet from balance', () => {
        const player = createMockPlayer('user-1', 'playing', 900, 100)
        const gameState = createMockGameState([player], 'playing', 0)
        const newCard = createMockCard('5', 5)

        const result = stateMachine.processAction(
          gameState,
          'user-1',
          'double',
          newCard,
        )

        expect(result.players[0].bet).toBe(200)
        expect(result.players[0].balance).toBe(800)
      })

      it('should add card to hand when doubling', () => {
        const player = createMockPlayer('user-1')
        const gameState = createMockGameState([player], 'playing', 0)
        const newCard = createMockCard('5', 5)

        const result = stateMachine.processAction(
          gameState,
          'user-1',
          'double',
          newCard,
        )

        expect(result.players[0].hand).toHaveLength(3)
        expect(result.players[0].hand[2]).toEqual(newCard)
      })

      it('should set player status to bust if hand exceeds 21 after double', () => {
        const player = createMockPlayer('user-1')
        player.hand = [createMockCard('K', 10), createMockCard('Q', 10)]
        const gameState = createMockGameState([player], 'playing', 0)
        const bustCard = createMockCard('5', 5)

        const result = stateMachine.processAction(
          gameState,
          'user-1',
          'double',
          bustCard,
        )

        expect(result.players[0].status).toBe('bust')
      })

      it('should set player status to stand if hand does not bust after double', () => {
        const player = createMockPlayer('user-1')
        player.hand = [createMockCard('5', 5), createMockCard('5', 5)]
        const gameState = createMockGameState([player], 'playing', 0)
        const newCard = createMockCard('5', 5)

        const result = stateMachine.processAction(
          gameState,
          'user-1',
          'double',
          newCard,
        )

        expect(result.players[0].status).toBe('stand')
      })

      it('should move to next player after double', () => {
        const player1 = createMockPlayer('user-1')
        const player2 = createMockPlayer('user-2')
        const gameState = createMockGameState([player1, player2], 'playing', 0)
        const newCard = createMockCard('5', 5)

        const result = stateMachine.processAction(
          gameState,
          'user-1',
          'double',
          newCard,
        )

        expect(result.currentPlayerIndex).toBe(1)
      })

      it('should correctly deduct balance when doubling with different bet amounts', () => {
        const player = createMockPlayer('user-1', 'playing', 1000, 250)
        const gameState = createMockGameState([player], 'playing', 0)
        const newCard = createMockCard('5', 5)

        const result = stateMachine.processAction(
          gameState,
          'user-1',
          'double',
          newCard,
        )

        expect(result.players[0].bet).toBe(500)
        expect(result.players[0].balance).toBe(750)
      })
    })

    describe('split action', () => {
      it('should move to next player after split (split action does nothing but moves to next)', () => {
        const player1 = createMockPlayer('user-1')
        const player2 = createMockPlayer('user-2')
        const gameState = createMockGameState([player1, player2], 'playing', 0)

        const result = stateMachine.processAction(gameState, 'user-1', 'split')

        // Split is not implemented, so it just moves to next player
        expect(result.currentPlayerIndex).toBe(1)
      })
    })

    describe('game state transitions', () => {
      it('should transition to dealer-turn when all players are not in playing status', () => {
        const player1 = createMockPlayer('user-1')
        const player2 = createMockPlayer('user-2')
        const gameState = createMockGameState([player1, player2], 'playing', 0)

        let result = stateMachine.processAction(gameState, 'user-1', 'stand')
        expect(result.currentPlayerIndex).toBe(1)

        result = stateMachine.processAction(result, 'user-2', 'stand')
        expect(result.status).toBe('dealer-turn')
      })

      it('should handle multiple players with mixed actions', () => {
        const player1 = createMockPlayer('user-1')
        const player2 = createMockPlayer('user-2')
        const player3 = createMockPlayer('user-3')
        const gameState = createMockGameState(
          [player1, player2, player3],
          'playing',
          0,
        )

        let result = stateMachine.processAction(gameState, 'user-1', 'stand')
        expect(result.currentPlayerIndex).toBe(1)

        const newCard = createMockCard('2', 2)
        result = stateMachine.processAction(result, 'user-2', 'hit', newCard)
        expect(result.currentPlayerIndex).toBe(2)

        result = stateMachine.processAction(result, 'user-3', 'stand')
        expect(result.status).toBe('dealer-turn')
      })
    })

    describe('edge cases', () => {
      it('should return unchanged game state when player does not exist', () => {
        const player = createMockPlayer('user-1')
        const gameState = createMockGameState([player], 'playing', 0)
        const originalState = JSON.stringify(gameState)

        const result = stateMachine.processAction(gameState, 'user-2', 'hit')

        expect(JSON.stringify(result)).toBe(originalState)
      })

      it('should handle action without card parameter', () => {
        const player = createMockPlayer('user-1')
        const gameState = createMockGameState([player], 'playing', 0)

        const result = stateMachine.processAction(gameState, 'user-1', 'stand')

        expect(result.players[0].status).toBe('stand')
      })
    })
  })
})
