// 前端型別,對應 API WS 發出的 BroadcastState(apps/api/src/game/interfaces/game-state.interface.ts)

export type PlayingCard = {
  card: string // 顯示字串,如 'A♠'
  suit: string
  value: number
  rank: number
}

export type PlayerStatus = 'playing' | 'bust' | 'stand' | 'settled'

export type PlayerEntry = {
  userId: string
  username: string
  hand: PlayingCard[]
  bet: number
  status: PlayerStatus
  score: number
}

export type GameResultRow = {
  userId: string
  won: boolean
  payout: number
  reason: string // 'win' | 'loss' | 'push'
}

export type GameStatusValue =
  | 'waiting'
  | 'dealer-turn'
  | 'player-turn'
  | 'completed'

export type BroadcastState = {
  status: GameStatusValue
  pot: number
  dealerHand: PlayingCard[]
  currentPlayerIndex: number // completed 時為 -1
  players: PlayerEntry[]
  results?: GameResultRow[]
}

export type GameAction = 'hit' | 'stand' | 'double'
