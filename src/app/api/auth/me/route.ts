import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const adminSession = cookieStore.get('admin_session')?.value
    const isAdminSession = adminSession === 'true' || adminSession === 'authenticated'

    const token = cookieStore.get('auth_token')?.value
    let user: any = null

    if (token) {
      try {
        const secret = process.env.JWT_SECRET || 'fallback-secret-key-change-me'
        const { payload } = await jwtVerify(token, new TextEncoder().encode(secret))
        user = payload
      } catch {
        // ignore invalid user token
      }
    }

    const isAdmin = Boolean(isAdminSession || user?.role === 'ADMIN')

    return NextResponse.json({
      isAdmin,
      user: user ? { id: user.id, email: user.email, name: user.name, role: user.role } : null
    })
  } catch (err) {
    return NextResponse.json({ isAdmin: false, user: null })
  }
}
