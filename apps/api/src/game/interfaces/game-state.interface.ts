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

export type GameAction = 'hit' | 'stand' | 'double'

export type PlayingCard = { card: string; suit: string; value: number; rank: number }
export type PlayerEntry = { userId: string; username: string; hand: PlayingCard[]; bet: number; status: 'playing'|'bust'|'stand'|'blackjack'|'settled'; score: number }
export type GameResultRow = { userId: string; won: boolean; payout: number; reason: string }
export type BroadcastState = { status: 'waiting'|'dealing'|'player-turn'|'dealer-turn'|'completed'; pot: number; dealerHand: PlayingCard[]; currentPlayerIndex: number; players: PlayerEntry[]; results?: GameResultRow[] }
