import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('admin_session')

    if (!sessionCookie || sessionCookie.value !== 'true') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name } = await request.json()

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Chapter name is required' }, { status: 400 })
    }

    const chapter = await prisma.chapter.create({
      data: {
        name: name.trim()
      }
    })

    return NextResponse.json({ success: true, chapter })
  } catch (error: any) {
    console.error('Error creating chapter:', error)
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A chapter with this name already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create chapter' }, { status: 500 })
  }
}
