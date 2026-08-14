import React from 'react'

interface GameStatusProps {
  gameState: any
}

export const GameStatus: React.FC<GameStatusProps> = ({ gameState }) => {
  return (
    <div className="bg-card p-4 rounded-lg border border-border">
      <h3 className="text-xl font-semibold mb-4 text-card-foreground">
        Game Status
      </h3>
      {gameState ? (
        <div className="space-y-2 text-card-foreground">
          <p>
            <span className="font-medium">Status:</span> {gameState.status}
          </p>
          <p>
            <span className="font-medium">Current Turn:</span>{' '}
            {gameState.currentTurn || 'None'}
          </p>
          <p>
            <span className="font-medium">Pot:</span> ${gameState.pot || 0}
          </p>
          <p>
            <span className="font-medium">Players:</span>{' '}
            {gameState.players?.length || 0}
          </p>
        </div>
      ) : (
        <p className="text-muted-foreground">No game data available</p>
      )}
    </div>
  )
}
