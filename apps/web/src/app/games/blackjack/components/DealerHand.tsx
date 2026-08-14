import React from 'react'

interface DealerHandProps {
  hand: string[]
}

export const DealerHand: React.FC<DealerHandProps> = ({ hand }) => {
  return (
    <div className="mb-8">
      <h3 className="text-xl font-semibold mb-4 text-center">Dealer</h3>
      <div className="flex justify-center space-x-2 flex-wrap">
        {hand.length > 0 ? (
          hand.map((card, index) => (
            <div
              key={index}
              className="bg-card border-2 border-border rounded-lg w-16 h-24 flex items-center justify-center text-xl font-bold shadow-md text-card-foreground"
            >
              {card}
            </div>
          ))
        ) : (
          <p className="text-muted-foreground">No cards dealt yet</p>
        )}
      </div>
    </div>
  )
}
