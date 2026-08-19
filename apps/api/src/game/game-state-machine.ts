import { GameState } from './interfaces/game-state.interface'
import { BlackjackEngine } from './engines/blackjack.engine'
import { Card } from './engines/card-deck'

export type GameAction = 'hit' | 'stand' | 'double' | 'split'

export class GameStateMachine {
  private blackjackEngine = new BlackjackEngine()

  isValidAction(
    gameState: GameState,
    userId: string,
    action: GameAction,
  ): boolean {
    // 檢查遊戲狀態
    if (gameState.status !== 'playing') {
      return false
    }

    // 找到玩家
    const player = gameState.players.find((p) => p.userId === userId)
    if (!player) {
      return false
    }

    // 檢查是否輪到該玩家
    const currentPlayer = gameState.players[gameState.currentPlayerIndex]
    if (currentPlayer.userId !== userId) {
      return false
    }

    // 檢查玩家狀態
    if (player.status !== 'playing') {
      return false
    }

    // 檢查 action 的合法性
    if (!['hit', 'stand', 'double', 'split'].includes(action)) {
      return false
    }

    return true
  }

  processAction(
    gameState: GameState,
    userId: string,
    action: GameAction,
    card?: Card,
  ): GameState {
    const playerIndex = gameState.players.findIndex((p) => p.userId === userId)
    if (playerIndex === -1) {
      return gameState
    }

    const player = gameState.players[playerIndex]

    switch (action) {
      case 'hit':
        if (card) {
          player.hand.push(card)
          const handEval = this.blackjackEngine.evaluateHand({
            cards: player.hand,
          })
          if (handEval.isBust) {
            player.status = 'bust'
          }
        }
        break

      case 'stand':
        player.status = 'stand'
        break

      case 'double':
        if (card) {
          const additionalBet = player.bet
          player.bet += additionalBet
          player.balance -= additionalBet
          player.hand.push(card)
          const handEval = this.blackjackEngine.evaluateHand({
            cards: player.hand,
          })
          if (handEval.isBust) {
            player.status = 'bust'
          } else {
            player.status = 'stand'
          }
        }
        break

      case 'split':
        // 簡化實現：暫不支援 split
        break
    }

    // 移動到下一個玩家
    let nextPlayerIndex = playerIndex + 1
    while (nextPlayerIndex < gameState.players.length) {
      if (gameState.players[nextPlayerIndex].status === 'playing') {
        gameState.currentPlayerIndex = nextPlayerIndex
        return gameState
      }
      nextPlayerIndex++
    }

    // 所有玩家都完成了，進入莊家回合
    gameState.status = 'dealer-turn'
    return gameState
  }
}
