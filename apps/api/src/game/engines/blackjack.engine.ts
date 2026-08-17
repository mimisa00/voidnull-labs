import { Card } from './card-deck'

export interface Hand {
  cards: Card[]
}

export interface HandEvaluation {
  value: number
  isBust: boolean
  isBlackjack: boolean
}

export class BlackjackEngine {
  evaluateHand(hand: Hand): HandEvaluation {
    let value = 0
    let acesCount = 0

    // 計算基礎點數和 A 牌數量
    for (const card of hand.cards) {
      value += card.value
      if (card.rank === 'A') {
        acesCount++
      }
    }

    // 調整 A 牌的點數：盡量讓 A 當 11 點算，但不超過 21
    while (value + 10 <= 21 && acesCount > 0) {
      value += 10
      acesCount--
    }

    const isBust = value > 21
    const isBlackjack = hand.cards.length === 2 && value === 21

    return {
      value,
      isBust,
      isBlackjack,
    }
  }

  determineWinner(
    playerHand: Hand,
    dealerHand: Hand,
  ): 'player' | 'dealer' | 'push' {
    const playerEval = this.evaluateHand(playerHand)
    const dealerEval = this.evaluateHand(dealerHand)

    // 玩家 bust，莊家勝
    if (playerEval.isBust) {
      return 'dealer'
    }

    // 莊家 bust（玩家未 bust），玩家勝
    if (dealerEval.isBust) {
      return 'player'
    }

    // 都沒 bust，比較點數
    if (playerEval.value > dealerEval.value) {
      return 'player'
    } else if (dealerEval.value > playerEval.value) {
      return 'dealer'
    } else {
      return 'push'
    }
  }

  shouldDealerHit(dealerHand: Hand): boolean {
    const dealerEval = this.evaluateHand(dealerHand)
    return dealerEval.value < 17
  }
}
