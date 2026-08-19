import { Card } from '../engines/card-deck'

export interface PlayerState {
  id: string
  userId: string
  hand: Card[]
  status: 'playing' | 'stand' | 'bust' | 'completed'
  bet: number
  balance: number
  position: number
}

export interface GameState {
  id: string
  status: 'waiting' | 'playing' | 'dealer-turn' | 'completed'
  players: PlayerState[]
  dealerHand: Card[]
  pot: number
  currentPlayerIndex: number
  deckCards: Card[]
  results?: GameResult[]
}

export interface GameResult {
  userId: string
  result: 'win' | 'loss' | 'push'
  payout: number
}

export type GameAction = 'hit' | 'stand' | 'double' | 'split'
