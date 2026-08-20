import React from 'react'
import type { GameResultRow, GameStatusValue } from '../types'

interface GameStatusProps {
  status: GameStatusValue
  pot: number
  turnMessage: string
  myResult: GameResultRow | null
}

export const GameStatus: React.FC<GameStatusProps> = ({
  status,
  pot,
  turnMessage,
  myResult,
}) => {
  return (
    <div className="bg-card p-4 rounded-lg border border-border">
      <h3 className="text-xl font-semibold mb-4 text-card-foreground">
        Game Status
      </h3>
      <div className="space-y-2 text-card-foreground">
        <p>
          <span className="font-medium">Status:</span> {status}
        </p>
        <p>
          <span className="font-medium">Turn:</span> {turnMessage}
        </p>
        <p>
          <span className="font-medium">Pot:</span> ${pot || 0}
        </p>
        {myResult && (
          <div
            className={`mt-4 p-3 rounded-lg text-sm font-semibold ${
              myResult.reason === 'win'
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : myResult.reason === 'push'
                  ? 'bg-slate-500/15 text-slate-600 dark:text-slate-400'
                  : 'bg-red-500/15 text-red-600 dark:text-red-400'
            }`}
          >
            {myResult.reason === 'win'
              ? 'You won!'
              : myResult.reason === 'push'
                ? 'Push'
                : 'You lost'}
            <span className="block font-normal mt-1">
              Payout: ${myResult.payout || 0}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
