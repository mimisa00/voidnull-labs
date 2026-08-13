import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/register']

// Helper to decode JWT and extract permissions
function getPermissionsFromToken(token: string): string[] {
  try {
    const payloadBase64 = token.split('.')[1]
    const decoded = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'))
    const payload: any = JSON.parse(decoded)
    return payload.permissions || []
  } catch {
    return []
  }
}

// Helper to determine redirect path based on permissions
function getRedirectPath(permissions: string[]): string {
  if (permissions.includes('operations:read')) {
    return '/operations/dashboard'
  }
  if (permissions.includes('games:read')) {
    return '/games/lobby'
  }
  if (permissions.includes('client:read')) {
    return '/client/home'
  }
  return '/dashboard'
}

export function middleware(request: NextRequest) {
  const token =
    request.cookies.get('access_token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '')

  const isPublic = PUBLIC_PATHS.some((p) =>
    request.nextUrl.pathname.startsWith(p),
  )

  // If no token and not on a public page, redirect to login
  if (!token && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If token exists and user is trying to access public pages like login/register, redirect based on permissions
  if (token && isPublic) {
    const permissions = getPermissionsFromToken(token)
    const redirectPath = getRedirectPath(permissions)
    return NextResponse.redirect(new URL(redirectPath, request.url))
  }

  // If token exists and user is accessing /dashboard, redirect based on permissions
  if (token && request.nextUrl.pathname === '/dashboard') {
    const permissions = getPermissionsFromToken(token)
    const redirectPath = getRedirectPath(permissions)
    // Only redirect if the target path is different from /dashboard
    if (redirectPath !== '/dashboard') {
      return NextResponse.redirect(new URL(redirectPath, request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
