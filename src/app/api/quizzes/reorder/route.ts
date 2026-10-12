import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'

async function checkAdminAuth() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('admin_session')
  return sessionCookie && (sessionCookie.value === 'true' || sessionCookie.value === 'authenticated')
}

export async function PATCH(request: Request) {
  try {
    const isAdmin = await checkAdminAuth()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { quizIds } = await request.json()

    if (!Array.isArray(quizIds) || quizIds.length === 0) {
      return NextResponse.json({ error: 'quizIds array is required' }, { status: 400 })
    }

    // Update the order of each quiz in a single transaction
    await prisma.$transaction(
      quizIds.map((id: number, index: number) =>
        prisma.quiz.update({
          where: { id },
          data: { order: index }
        })
      )
    )

    return NextResponse.json({ success: true, message: 'Quizzes reordered successfully' })
  } catch (error: any) {
    console.error('Error reordering quizzes:', error)
    return NextResponse.json({ error: 'Failed to reorder quizzes' }, { status: 500 })
  }
}
