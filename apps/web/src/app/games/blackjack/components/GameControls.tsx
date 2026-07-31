import React from 'react';
import { Button } from '@/components/ui/button';

interface GameControlsProps {
  onAction: (action: string) => void;
}

export const GameControls: React.FC<GameControlsProps> = ({ onAction }) => {
  return (
    <div className="bg-gray-100 p-4 rounded-lg">
      <h3 className="text-xl font-semibold mb-4">Game Controls</h3>
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => onAction('hit')} variant="default" className="w-full">
          Hit
        </Button>
        <Button onClick={() => onAction('stand')} variant="outline" className="w-full">
          Stand
        </Button>
        <Button onClick={() => onAction('double')} variant="secondary" className="w-full">
          Double Down
        </Button>
        <Button onClick={() => onAction('split')} variant="secondary" className="w-full">
          Split
        </Button>
      </div>
    </div>
  );
};