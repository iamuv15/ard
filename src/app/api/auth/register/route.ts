import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { generateToken } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const { name, email, password, inviteCode } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    const expectedCode = process.env.INVITE_CODE || 'Billu'
    if (!inviteCode || inviteCode.trim().toLowerCase() !== expectedCode.trim().toLowerCase()) {
      return NextResponse.json({ error: 'Invalid invite code. A valid invite code is required to register.' }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      }
    })

    const token = await generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    })

    const response = NextResponse.json({ success: true, user: { name: user.name, email: user.email } })
    response.cookies.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    })

    return response
  } catch (error: any) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
