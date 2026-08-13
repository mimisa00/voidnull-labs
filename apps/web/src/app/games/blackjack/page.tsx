'use client';

import { useState, useEffect } from 'react';
import { getSocket, connectSocket } from '@/lib/socket';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PlayerHand,
  DealerHand,
  GameControls,
  GameStatus
} from './components';

export default function BlackjackGame() {
  const [gameId, setGameId] = useState<string | null>(null);
  const [playerPosition, setPlayerPosition] = useState<number | null>(null);
  const [gameState, setGameState] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Connect to WebSocket
  useEffect(() => {
    const socket = getSocket();

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to game server');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from game server');
    });

    // Handle game events
    socket.on('game:created', (data) => {
      setGameId(data.gameId);
      console.log('Game created:', data.gameId);
    });

    socket.on('game:joined', (data) => {
      setPlayerPosition(data.playerPosition);
      console.log('Joined game at position:', data.playerPosition);
    });

    socket.on('game:updated', (data) => {
      setGameState(data);
      console.log('Game updated:', data);
    });

    // Connect to socket
    connectSocket();

    return () => {
      socket.disconnect();
    };
  }, []);

  const createGame = () => {
    const socket = getSocket();
    socket.emit('game:create', {
      gameType: 'blackjack',
      maxPlayers: 4,
      buyIn: 100
    });
  };

  const joinGame = () => {
    if (!gameId) return;

    const socket = getSocket();
    socket.emit('game:join', {
      gameId,
      playerId: 'current-user-id' // This would come from authentication context
    });
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Blackjack Game</h1>

      {!gameId ? (
        <Card>
          <CardHeader>
            <CardTitle>Start a New Game</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={createGame} className="mr-4">
              Create Game
            </Button>
            <p className="mt-4 text-gray-600">Create a new Blackjack game room to start playing!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Game Table */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Game Table</CardTitle>
              </CardHeader>
              <CardContent>
                {gameState ? (
                  <>
                    <DealerHand hand={gameState.dealerHand || []} />
                    <div className="my-8 flex justify-center">
                      <div className="bg-green-700 rounded-lg p-4 text-white font-bold">
                        Pot: ${gameState.pot || 0}
                      </div>
                    </div>
                    <PlayerHand
                      hand={gameState.playerHand || []}
                      position={playerPosition}
                    />
                  </>
                ) : (
                  <p className="text-center py-8 text-gray-500">Waiting for game to start...</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Game Controls and Info */}
          <div className="space-y-6">
            <GameControls
              onAction={(action) => {
                if (gameId) {
                  const socket = getSocket();
                  socket.emit('game:action', {
                    gameId,
                    action,
                    playerId: 'current-user-id'
                  });
                }
              }}
            />

            <GameStatus gameState={gameState} />
          </div>
        </div>
      )}
    </div>
  );
}