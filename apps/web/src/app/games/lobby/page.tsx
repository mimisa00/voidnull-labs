'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getSocket, connectSocket } from '@/lib/socket'
import { gamesApi } from '@/lib/api'
import { useAuthContext } from '@/context/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface GameSummary {
  id: string
  type: string
  status: string
  maxPlayers: number
  buyIn: number
  pot?: number
}

export default function GameLobby() {
  const router = useRouter()
  const { hasPermission } = useAuthContext()
  const canCreate = hasPermission('games:create')
  const [games, setGames] = useState<GameSummary[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const refreshGames = useCallback(async () => {
    try {
      const data = await gamesApi.getGames()
      setGames(data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshGames()

    const socket = getSocket()

    socket.on('connect', () => {
      setIsConnected(true)
      // Resync on (re)connect to recover events missed during disconnect
      refreshGames()
    })

    socket.on('disconnect', () => setIsConnected(false))

    // Global event: a new table was created → add to list immediately
    socket.on('game:created', (data: any) => {
      const newGame: GameSummary = {
        id: data.id ?? data.gameId,
        type: data.type ?? 'blackjack',
        status: data.status ?? 'waiting',
        maxPlayers: data.maxPlayers ?? 0,
        buyIn: data.buyIn ?? 0,
        pot: data.pot ?? 0,
      }
      setGames((prev) =>
        prev.some((g) => g.id === newGame.id) ? prev : [...prev, newGame],
      )
    })

    // Per-room game state change; patch the matching table in the list.
    // NOTE: the gateway currently emits `game:updated` only to clients in
    // the `game:<id>` room.  The lobby does not join that room, so this
    // listener will not fire until the gateway is updated to also broadcast
    // to all connected clients (or a dedicated lobby room).  Kept here so
    // the integration works as soon as that change lands.
    socket.on('game:updated', (data: any) => {
      setGames((prev) =>
        prev.map((g) =>
          g.id === data.gameId
            ? {
                ...g,
                status: data.state?.status ?? g.status,
                pot: data.state?.pot ?? g.pot,
              }
            : g,
        ),
      )
    })

    connectSocket()

    return () => {
      socket.disconnect()
    }
  }, [refreshGames])

  const createGame = () => {
    const socket = getSocket()
    socket.emit('game:create', {
      gameType: 'blackjack',
      maxPlayers: 4,
      buyIn: 100,
    })
  }

  const joinGame = (gameId: string) => {
    router.push(`/games/blackjack?gameId=${gameId}`)
  }

  // Only waiting tables accept players; the server rejects any other status
  // (game.service.ts joinGame throws unless status === 'waiting'), so gating
  // here avoids a wasted navigation that would fail silently.
  const canJoin = (game: GameSummary) => game.status === 'waiting'

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-primary">Game Lobby</h1>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">
          Available Games
          {isConnected && (
            <span
              className="ml-2 text-sm text-green-500"
              title="WebSocket connected"
            >
              ●
            </span>
          )}
        </h2>
        <Button disabled={!canCreate} onClick={createGame}>
          Create New Game
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Loading games…</p>
          </CardContent>
        </Card>
      ) : games.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game) => (
            <Card key={game.id}>
              <CardHeader>
                <CardTitle className="capitalize">{game.type} Table</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p>
                    <span className="font-medium">Status:</span>{' '}
                    <span className="capitalize">{game.status}</span>
                  </p>
                  <p>
                    <span className="font-medium">Max Players:</span>{' '}
                    {game.maxPlayers}
                  </p>
                  <p>
                    <span className="font-medium">Buy-in:</span> ${game.buyIn}
                  </p>
                  {game.pot !== undefined && (
                    <p>
                      <span className="font-medium">Pot:</span> ${game.pot}
                    </p>
                  )}
                </div>
                <Button
                  className="mt-4 w-full"
                  disabled={!canJoin(game)}
                  onClick={() => joinGame(game.id)}
                >
                  Join Game
                </Button>
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
            <p className="text-muted-foreground mb-4">
              There are no active games at the moment.
            </p>
            <Button disabled={!canCreate} onClick={createGame}>
              Create Your First Game
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
