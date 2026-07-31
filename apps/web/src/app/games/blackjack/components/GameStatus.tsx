import React from 'react';

interface GameStatusProps {
  gameState: any;
}

export const GameStatus: React.FC<GameStatusProps> = ({ gameState }) => {
  return (
    <div className="bg-gray-100 p-4 rounded-lg">
      <h3 className="text-xl font-semibold mb-4">Game Status</h3>
      {gameState ? (
        <div className="space-y-2">
          <p><span className="font-medium">Status:</span> {gameState.status}</p>
          <p><span className="font-medium">Current Turn:</span> {gameState.currentTurn || 'None'}</p>
          <p><span className="font-medium">Pot:</span> ${gameState.pot || 0}</p>
          <p><span className="font-medium">Players:</span> {gameState.players?.length || 0}</p>
        </div>
      ) : (
        <p className="text-gray-500">No game data available</p>
      )}
    </div>
  );
};