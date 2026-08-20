'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { getSocket, connectSocket } from '@/lib/socket'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlayerHand, DealerHand, GameControls, GameStatus } from './components'
import type { BroadcastState, GameAction } from './types'

const CREATE_GAME_PAYLOAD = {
  gameType: 'blackjack',
  maxPlayers: 4,
  buyIn: 100,
}

// 從 login 寫入的 access_token 解 JWT 的 sub（cookie 經 encodeURIComponent，讀時需 decode）
// 取 token 的來源與 lib/socket 保持一致：cookie 優先、localStorage 備援
function getSubFromToken(): string | null {
  if (typeof window === 'undefined') return null
  let token: string | null = null
  const match = document.cookie.match(/(^|; )access_token=([^;]*)/)
  if (match) token = decodeURIComponent(match[2])
  if (!token) token = window.localStorage.getItem('access_token')
  if (!token) return null
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    // JWT payload 是 base64url，atob 只接受 base64，需先換回並補 padding
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
    const payload = JSON.parse(atob(padded))
    return typeof payload.sub === 'string' ? payload.sub : null
  } catch {
    return null
  }
}

function buildTurnMessage(
  state: BroadcastState | null,
  ownIndex: number,
): string {
  if (!state) return 'Waiting for game to start...'
  switch (state.status) {
    case 'waiting':
      return '等待玩家加入'
    case 'player-turn':
      return ownIndex !== -1 && state.currentPlayerIndex === ownIndex
        ? '輪到你了!'
        : '等待下家行動…'
    case 'dealer-turn':
      return '莊家行動中…'
    case 'completed':
      return '本局結束'
  }
}

function BlackjackGame() {
  const searchParams = useSearchParams()
  const [sub, setSub] = useState<string | null>(null)
  const [gameState, setGameState] = useState<BroadcastState | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [joinError, setJoinError] = useState<string | null>(null)
  const gameIdRef = useRef<string | null>(null)

  // 加入牌桌；server 擋回（非 waiting、缺 games:join 權限等）會以 ack 回 success:false
  const joinGame = (gameId: string) => {
    const socket = getSocket()
    socket.emit(
      'game:join',
      { gameId },
      (res?: { success?: boolean; error?: string }) => {
        if (!res?.success) setJoinError(res?.error || '無法加入牌桌')
      },
    )
  }

  // 開桌；權限不足等失敗會在 ack 裡回 success:false，留給 page 顯示
  // ack 成功時帶回「自己這桌」的 gameId，記下後再 join（不依賴全域 broadcast）
  const createGame = () => {
    const socket = getSocket()
    socket.emit(
      'game:create',
      { ...CREATE_GAME_PAYLOAD },
      (res?: { success?: boolean; error?: string; id?: string }) => {
        if (!res?.success || !res.id) {
          setCreateError(res?.error || '無法建立牌局')
          return
        }
        gameIdRef.current = res.id
        joinGame(res.id)
      },
    )
  }

  useEffect(() => {
    const socket = getSocket()
    const urlGameId = searchParams.get('gameId')

    // game:updated / game:ended payload 都是 { gameId, state }，需 unwrap 取 state
    const onBroadcast = (data: { gameId: string; state: BroadcastState }) => {
      // 忽略非本桌的更新
      if (data.gameId && gameIdRef.current && data.gameId !== gameIdRef.current)
        return
      setGameState(data.state)
    }
    socket.on('game:updated', onBroadcast)
    socket.on('game:ended', onBroadcast)

    setSub(getSubFromToken())

    connectSocket()

    // 進桌：有 ?gameId 就直接加入；沒有就自己開桌（create 的 ack 帶回自己的 gameId 後再 join）
    if (urlGameId) {
      gameIdRef.current = urlGameId
      joinGame(urlGameId)
    } else {
      createGame()
    }

    return () => {
      socket.off('game:updated', onBroadcast)
      socket.off('game:ended', onBroadcast)
      socket.disconnect()
    }
  }, [searchParams])

  const handleAction = (action: GameAction) => {
    if (!gameIdRef.current) return
    getSocket().emit('game:action', { gameId: gameIdRef.current, action })
  }

  // 本局結束後重開一局（新建桌，create 的 ack 帶回新桌 gameId 後自動 join）
  const playAgain = () => {
    setGameState(null)
    setCreateError(null)
    setJoinError(null)
    gameIdRef.current = null
    createGame()
  }

  // 找「自己」：players 裡 userId 等於 token sub 的那條
  const me = gameState?.players.find((p) => p.userId === sub)
  const ownIndex = gameState
    ? gameState.players.findIndex((p) => p.userId === sub)
    : -1
  const canAct =
    gameState?.status === 'player-turn' &&
    ownIndex !== -1 &&
    gameState.currentPlayerIndex === ownIndex
  const myResult =
    gameState?.status === 'completed'
      ? (gameState.results?.find((r) => r.userId === sub) ?? null)
      : null
  const turnMessage = buildTurnMessage(gameState, ownIndex)

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-primary">Blackjack Game</h1>

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
                  <DealerHand hand={gameState.dealerHand} />
                  <div className="my-8 flex justify-center">
                    <div className="bg-green-700 rounded-lg p-4 text-white font-bold">
                      Pot: ${gameState.pot || 0}
                    </div>
                  </div>
                  <PlayerHand
                    hand={me?.hand ?? []}
                    score={me?.score ?? 0}
                    status={me?.status ?? 'playing'}
                  />
                </>
              ) : (
                <p className="text-center py-8 text-muted-foreground">
                  {createError ?? joinError ?? 'Waiting for game to start...'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Game Controls and Info */}
        <div className="space-y-6">
          <GameControls canAct={canAct} onAction={handleAction} />

          <GameStatus
            status={gameState?.status ?? 'waiting'}
            pot={gameState?.pot ?? 0}
            turnMessage={turnMessage}
            myResult={myResult}
          />

          {gameState?.status === 'completed' && (
            <Button
              onClick={playAgain}
              className="w-full bg-primary text-primary-foreground hover:bg-accent rounded-lg"
            >
              Play Again
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function BlackjackPage() {
  // Next.js 要求 useSearchParams 必須在 Suspense boundary 內（static prerender）
  return (
    <Suspense
      fallback={
        <p className="py-8 text-center text-muted-foreground">Loading…</p>
      }
    >
      <BlackjackGame />
    </Suspense>
  )
}
