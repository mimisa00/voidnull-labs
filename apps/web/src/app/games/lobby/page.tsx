'use client'

import { useState, useEffect } from 'react'
import { getSocket, connectSocket } from '@/lib/socket'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function GameLobby() {
  const [games, setGames] = useState<any[]>([])
  const [isConnected, setIsConnected] = useState(false)

  // Connect to WebSocket
  useEffect(() => {
    const socket = getSocket()

    socket.on('connect', () => {
      setIsConnected(true)
      console.log('Connected to game server')
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
      console.log('Disconnected from game server')
    })

    // Handle game updates
    socket.on('game:updated', (data) => {
      setGames((prev) => {
        const existingIndex = prev.findIndex((g) => g.id === data.gameId)
        if (existingIndex >= 0) {
          const updatedGames = [...prev]
          updatedGames[existingIndex] = {
            ...updatedGames[existingIndex],
            ...data,
          }
          return updatedGames
        }
        return [...prev, data]
      })
    })

    // Connect to socket
    connectSocket()

    return () => {
      socket.disconnect()
    }
  }, [])

  const createGame = () => {
    const socket = getSocket()
    socket.emit('game:create', {
      gameType: 'blackjack',
      maxPlayers: 4,
      buyIn: 100,
    })
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Game Lobby</h1>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Available Games</h2>
        <Button onClick={createGame}>Create New Game</Button>
      </div>

      {games.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game) => (
            <Card key={game.id}>
              <CardHeader>
                <CardTitle>Blackjack Game</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p>
                    <span className="font-medium">Status:</span> {game.status}
                  </p>
                  <p>
                    <span className="font-medium">Players:</span>{' '}
                    {game.players?.length || 0}/{game.maxPlayers}
                  </p>
                  <p>
                    <span className="font-medium">Buy-in:</span> ${game.buyIn}
                  </p>
                  <p>
                    <span className="font-medium">Pot:</span> ${game.pot || 0}
                  </p>
                </div>
                <Button className="mt-4 w-full">Join Game</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Games Available</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              There are no active games at the moment.
            </p>
            <Button onClick={createGame}>Create Your First Game</Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
