import React from 'react'
import { PlayingCardView } from './PlayingCardView'
import type { PlayingCard } from '../types'

interface DealerHandProps {
  hand: PlayingCard[]
}

export const DealerHand: React.FC<DealerHandProps> = ({ hand }) => {
  // 暗牌遮蔽由 server 處理,前端照收到的卡渲染
  return (
    <div className="mb-8">
      <h3 className="text-xl font-semibold mb-4 text-center text-card-foreground">
        Dealer
      </h3>
      <div className="flex justify-center space-x-2 flex-wrap">
        {hand.length > 0 ? (
          hand.map((card, index) => (
            <PlayingCardView key={index} card={card} />
          ))
        ) : (
          <p className="text-muted-foreground">No cards dealt yet</p>
        )}
      </div>
    </div>
  )
}
