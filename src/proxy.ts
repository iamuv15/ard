import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Define paths that require authentication
  const protectedPaths = ['/quiz', '/redemption', '/chapter']
  
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))

  if (isProtectedPath) {
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    try {
      const secret = process.env.JWT_SECRET || 'fallback-secret-key-change-me'
      await jwtVerify(token, new TextEncoder().encode(secret))
    } catch (err) {
      // Invalid token
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      const response = NextResponse.redirect(loginUrl)
      response.cookies.delete('auth_token')
      return response
    }
  }

  // Admin protection
  const isAdminPath = pathname.startsWith('/admin')
  const isAdminPublicPath = pathname === '/admin/login'
  const adminToken = request.cookies.get('admin_session')?.value || request.cookies.get('admin_token')?.value

  if (isAdminPath && !isAdminPublicPath && (!adminToken || (adminToken !== 'true' && adminToken !== 'authenticated'))) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  if (isAdminPublicPath && adminToken) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
