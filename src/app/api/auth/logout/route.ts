import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ success: true })

  // Delete all auth cookies for both root and /ard
  const cookieNames = ['auth_token', 'admin_session', 'admin_token']
  
  for (const name of cookieNames) {
    response.cookies.set({
      name,
      value: '',
      path: '/',
      maxAge: 0,
      expires: new Date(0),
    })
    response.cookies.set({
      name,
      value: '',
      path: '/ard',
      maxAge: 0,
      expires: new Date(0),
    })
  }

  return response
}
