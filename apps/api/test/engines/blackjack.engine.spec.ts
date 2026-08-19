import { BlackjackEngine, Hand } from '../../src/game/engines/blackjack.engine'

describe('BlackjackEngine', () => {
  let engine: BlackjackEngine

  beforeEach(() => {
    engine = new BlackjackEngine()
  })

  describe('evaluateHand', () => {
    it('should evaluate simple hand', () => {
      const hand: Hand = {
        cards: [
          { suit: '♠', rank: '5', value: 5 },
          { suit: '♥', rank: '7', value: 7 },
        ],
      }
      const result = engine.evaluateHand(hand)
      expect(result.value).toBe(12)
      expect(result.isBust).toBe(false)
      expect(result.isBlackjack).toBe(false)
    })

    it('should detect blackjack', () => {
      const hand: Hand = {
        cards: [
          { suit: '♠', rank: 'A', value: 1 },
          { suit: '♥', rank: 'K', value: 10 },
        ],
      }
      const result = engine.evaluateHand(hand)
      expect(result.value).toBe(21)
      expect(result.isBlackjack).toBe(true)
    })

    it('should handle ace as 11', () => {
      const hand: Hand = {
        cards: [
          { suit: '♠', rank: 'A', value: 1 },
          { suit: '♥', rank: '5', value: 5 },
        ],
      }
      const result = engine.evaluateHand(hand)
      expect(result.value).toBe(16)
    })

    it('should detect bust', () => {
      const hand: Hand = {
        cards: [
          { suit: '♠', rank: 'K', value: 10 },
          { suit: '♥', rank: 'Q', value: 10 },
          { suit: '♦', rank: '5', value: 5 },
        ],
      }
      const result = engine.evaluateHand(hand)
      expect(result.isBust).toBe(true)
    })

    it('should handle multiple aces', () => {
      const hand: Hand = {
        cards: [
          { suit: '♠', rank: 'A', value: 1 },
          { suit: '♥', rank: 'A', value: 1 },
          { suit: '♦', rank: '9', value: 9 },
        ],
      }
      const result = engine.evaluateHand(hand)
      expect(result.value).toBe(21)
    })

    it('should not detect blackjack with 3+ cards', () => {
      const hand: Hand = {
        cards: [
          { suit: '♠', rank: '7', value: 7 },
          { suit: '♥', rank: '7', value: 7 },
          { suit: '♦', rank: '7', value: 7 },
        ],
      }
      const result = engine.evaluateHand(hand)
      expect(result.value).toBe(21)
      expect(result.isBlackjack).toBe(false)
    })
  })

  describe('determineWinner', () => {
    it('player wins with higher value', () => {
      const playerHand: Hand = {
        cards: [
          { suit: '♠', rank: 'K', value: 10 },
          { suit: '♥', rank: '9', value: 9 },
        ],
      }
      const dealerHand: Hand = {
        cards: [
          { suit: '♦', rank: 'K', value: 10 },
          { suit: '♣', rank: '8', value: 8 },
        ],
      }
      expect(engine.determineWinner(playerHand, dealerHand)).toBe('player')
    })

    it('dealer wins with higher value', () => {
      const playerHand: Hand = {
        cards: [
          { suit: '♠', rank: 'K', value: 10 },
          { suit: '♥', rank: '8', value: 8 },
        ],
      }
      const dealerHand: Hand = {
        cards: [
          { suit: '♦', rank: 'K', value: 10 },
          { suit: '♣', rank: '9', value: 9 },
        ],
      }
      expect(engine.determineWinner(playerHand, dealerHand)).toBe('dealer')
    })

    it('push when same value', () => {
      const playerHand: Hand = {
        cards: [
          { suit: '♠', rank: 'K', value: 10 },
          { suit: '♥', rank: '9', value: 9 },
        ],
      }
      const dealerHand: Hand = {
        cards: [
          { suit: '♦', rank: 'Q', value: 10 },
          { suit: '♣', rank: '9', value: 9 },
        ],
      }
      expect(engine.determineWinner(playerHand, dealerHand)).toBe('push')
    })

    it('dealer wins when player busts', () => {
      const playerHand: Hand = {
        cards: [
          { suit: '♠', rank: 'K', value: 10 },
          { suit: '♥', rank: 'Q', value: 10 },
          { suit: '♦', rank: '5', value: 5 },
        ],
      }
      const dealerHand: Hand = {
        cards: [
          { suit: '♣', rank: 'K', value: 10 },
          { suit: '♠', rank: '9', value: 9 },
        ],
      }
      expect(engine.determineWinner(playerHand, dealerHand)).toBe('dealer')
    })

    it('player wins when dealer busts', () => {
      const playerHand: Hand = {
        cards: [
          { suit: '♠', rank: 'K', value: 10 },
          { suit: '♥', rank: '9', value: 9 },
        ],
      }
      const dealerHand: Hand = {
        cards: [
          { suit: '♦', rank: 'K', value: 10 },
          { suit: '♣', rank: 'Q', value: 10 },
          { suit: '♠', rank: '5', value: 5 },
        ],
      }
      expect(engine.determineWinner(playerHand, dealerHand)).toBe('player')
    })

    it('dealer wins when both bust', () => {
      const playerHand: Hand = {
        cards: [
          { suit: '♠', rank: 'K', value: 10 },
          { suit: '♥', rank: 'Q', value: 10 },
          { suit: '♦', rank: '5', value: 5 },
        ],
      }
      const dealerHand: Hand = {
        cards: [
          { suit: '♣', rank: 'K', value: 10 },
          { suit: '♠', rank: 'Q', value: 10 },
          { suit: '♥', rank: '3', value: 3 },
        ],
      }
      expect(engine.determineWinner(playerHand, dealerHand)).toBe('dealer')
    })

    it('both 21 results in push', () => {
      const playerHand: Hand = {
        cards: [
          { suit: '♠', rank: 'A', value: 1 },
          { suit: '♥', rank: 'K', value: 10 },
        ],
      }
      const dealerHand: Hand = {
        cards: [
          { suit: '♦', rank: '7', value: 7 },
          { suit: '♣', rank: '7', value: 7 },
          { suit: '♠', rank: '7', value: 7 },
        ],
      }
      expect(engine.determineWinner(playerHand, dealerHand)).toBe('push')
    })
  })

  describe('shouldDealerHit', () => {
    it('should hit when less than 17', () => {
      const hand: Hand = {
        cards: [
          { suit: '♠', rank: 'K', value: 10 },
          { suit: '♥', rank: '5', value: 5 },
        ],
      }
      expect(engine.shouldDealerHit(hand)).toBe(true)
    })

    it('should not hit at 17', () => {
      const hand: Hand = {
        cards: [
          { suit: '♠', rank: 'K', value: 10 },
          { suit: '♥', rank: '7', value: 7 },
        ],
      }
      expect(engine.shouldDealerHit(hand)).toBe(false)
    })

    it('should not hit above 17', () => {
      const hand: Hand = {
        cards: [
          { suit: '♠', rank: 'K', value: 10 },
          { suit: '♥', rank: '9', value: 9 },
        ],
      }
      expect(engine.shouldDealerHit(hand)).toBe(false)
    })

    it('should not hit at 21', () => {
      const hand: Hand = {
        cards: [
          { suit: '♠', rank: 'A', value: 1 },
          { suit: '♥', rank: 'K', value: 10 },
        ],
      }
      expect(engine.shouldDealerHit(hand)).toBe(false)
    })

    it('soft 17 (A+6) evaluates to 17 and does not hit', () => {
      const hand: Hand = {
        cards: [
          { suit: '♠', rank: 'A', value: 1 },
          { suit: '♥', rank: '6', value: 6 },
        ],
      }
      const evaluation = engine.evaluateHand(hand)
      expect(evaluation.value).toBe(17)
      expect(engine.shouldDealerHit(hand)).toBe(false)
    })

    it('should hit with 16', () => {
      const hand: Hand = {
        cards: [
          { suit: '♠', rank: 'K', value: 10 },
          { suit: '♥', rank: '6', value: 6 },
        ],
      }
      expect(engine.shouldDealerHit(hand)).toBe(true)
    })
  })
})
