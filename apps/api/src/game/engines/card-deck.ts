import { randomInt } from 'crypto'

export type Suit = '♠' | '♥' | '♦' | '♣'
export type Rank =
  'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'

export interface Card {
  suit: Suit
  rank: Rank
  value: number
}

export class Deck {
  private cards: Card[] = []

  constructor(numDecks: number = 1) {
    this.initialize(numDecks)
    this.shuffle()
  }

  private initialize(numDecks: number): void {
    this.cards = []
    const suits: Suit[] = ['♠', '♥', '♦', '♣']
    const ranks: Rank[] = [
      'A',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '10',
      'J',
      'Q',
      'K',
    ]

    for (let d = 0; d < numDecks; d++) {
      for (const suit of suits) {
        for (const rank of ranks) {
          let value: number
          if (rank === 'A') {
            value = 1
          } else if (rank === 'J' || rank === 'Q' || rank === 'K') {
            value = 10
          } else {
            value = parseInt(rank, 10)
          }

          this.cards.push({ suit, rank, value })
        }
      }
    }
  }

  private shuffle(): void {
    // Fisher-Yates 洗牌演算法，使用密碼學安全隨機數
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = randomInt(0, i + 1)
      ;[this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]]
    }
  }

  drawCard(): Card {
    if (this.cards.length < 10) {
      this.initialize(1)
      this.shuffle()
    }

    const card = this.cards.pop()
    if (!card) {
      throw new Error('Failed to draw card')
    }
    return card
  }

  cardsRemaining(): number {
    return this.cards.length
  }

  getRemainingCards(): Card[] {
    return [...this.cards]
  }

  static fromCards(cards: Card[]): Deck {
    const deck = new Deck(0)
    deck.cards = [...cards]
    return deck
  }
}
