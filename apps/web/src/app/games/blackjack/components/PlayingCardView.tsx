import React from 'react'
import type { PlayingCard } from '../types'

const RED_SUITS = ['♥', '♦']

interface PlayingCardViewProps {
  card: PlayingCard
}

export const PlayingCardView: React.FC<PlayingCardViewProps> = ({ card }) => {
  const isRed = RED_SUITS.includes(card.suit)
  const rank = card.card.slice(0, -1) // card = `${rank}${suit}`,如 'A♠' / '10♠'

  return (
    <div
      className={`w-16 h-24 rounded-lg border-2 border-border bg-card shadow-md flex flex-col items-center justify-center font-bold ${
        isRed ? 'text-red-500' : 'text-card-foreground'
      }`}
    >
      <span className="text-xl leading-none">{rank}</span>
      <span className="text-2xl leading-none mt-1">{card.suit}</span>
    </div>
  )
}
