import React from 'react'
import { PlayingCardView } from './PlayingCardView'
import type { PlayingCard, PlayerStatus } from '../types'

interface PlayerHandProps {
  hand: PlayingCard[]
  score: number
  status: PlayerStatus
}

export const PlayerHand: React.FC<PlayerHandProps> = ({ hand, score, status }) => {
  const statusBadge =
    status === 'bust' ? (
      <span className="bg-red-500/15 text-red-600 dark:text-red-400 px-3 py-1 rounded-full text-sm font-semibold">
        Bust
      </span>
    ) : status === 'stand' ? (
      <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full text-sm font-semibold">
        Stood
      </span>
    ) : status === 'settled' ? (
      <span className="bg-slate-500/15 text-slate-600 dark:text-slate-400 px-3 py-1 rounded-full text-sm font-semibold">
        Settled
      </span>
    ) : null

  return (
    <div className="mt-8">
      <div className="flex items-center justify-center gap-3 mb-4">
        <h3 className="text-xl font-semibold text-card-foreground">Your Hand</h3>
        {hand.length > 0 && (
          <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-bold">
            {score}
          </span>
        )}
        {statusBadge}
      </div>
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
