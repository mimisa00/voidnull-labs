import React from 'react'
import { Button } from '@/components/ui/button'

interface GameControlsProps {
  onAction: (action: string) => void
}

export const GameControls: React.FC<GameControlsProps> = ({ onAction }) => {
  return (
    <div className="bg-card p-4 rounded-lg border border-border">
      <h3 className="text-xl font-semibold mb-4 text-card-foreground">
        Game Controls
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={() => onAction('hit')}
          className="w-full bg-primary text-primary-foreground hover:bg-accent rounded-lg"
        >
          Hit
        </Button>
        <Button
          onClick={() => onAction('stand')}
          className="w-full border border-border bg-background text-foreground hover:bg-muted rounded-lg"
        >
          Stand
        </Button>
        <Button
          onClick={() => onAction('double')}
          className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg"
        >
          Double Down
        </Button>
        <Button
          onClick={() => onAction('split')}
          className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg"
        >
          Split
        </Button>
      </div>
    </div>
  )
}
