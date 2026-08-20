import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  // Cookie is the primary source (login writes cookie first); localStorage is fallback
  const match = document.cookie.match(/(^|; )access_token=([^;]*)/)
  if (match) return decodeURIComponent(match[2])
  return localStorage.getItem('access_token')
}

export function getSocket(): Socket {
  if (!socket) {
    const token = getAccessToken()
    socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001', {
      auth: { token },
      autoConnect: false,
    })
  }
  return socket
}

export function connectSocket() {
  const s = getSocket()
  if (!s.connected) s.connect()
  return s
}

export function disconnectSocket() {
  if (socket?.connected) socket.disconnect()
}
