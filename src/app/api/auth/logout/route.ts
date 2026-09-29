import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ success: true })

  // Delete all auth cookies
  response.cookies.set({
    name: 'auth_token',
    value: '',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
    httpOnly: true,
  })

  response.cookies.set({
    name: 'admin_session',
    value: '',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
    httpOnly: true,
  })

  response.cookies.set({
    name: 'admin_token',
    value: '',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
    httpOnly: true,
  })

  return response
}
