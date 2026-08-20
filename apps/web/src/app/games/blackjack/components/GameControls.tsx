import React from 'react'
import { Button } from '@/components/ui/button'
import type { GameAction } from '../types'

interface GameControlsProps {
  canAct: boolean
  onAction: (action: GameAction) => void
}

export const GameControls: React.FC<GameControlsProps> = ({
  canAct,
  onAction,
}) => {
  return (
    <div className="bg-card p-4 rounded-lg border border-border">
      <h3 className="text-xl font-semibold mb-4 text-card-foreground">
        Game Controls
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={() => onAction('hit')}
          disabled={!canAct}
          className="w-full bg-primary text-primary-foreground hover:bg-accent rounded-lg"
        >
          Hit
        </Button>
        <Button
          onClick={() => onAction('stand')}
          disabled={!canAct}
          className="w-full border border-border bg-background text-foreground hover:bg-muted rounded-lg"
        >
          Stand
        </Button>
        <Button
          onClick={() => onAction('double')}
          disabled={!canAct}
          className="col-span-2 w-full bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg"
        >
          Double Down
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Double Down:追加等於下注的籌碼,再摸一張後自動 stand
      </p>
    </div>
  )
}
