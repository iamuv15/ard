import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'
import { incrementalQuizSync } from '@/lib/terminologyEngine'

async function checkAdminAuth() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('admin_session')
  return sessionCookie && (sessionCookie.value === 'true' || sessionCookie.value === 'authenticated')
}

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await checkAdminAuth()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await props.params
    const quizId = parseInt(params.id, 10)
    if (isNaN(quizId)) {
      return NextResponse.json({ error: 'Invalid quiz ID' }, { status: 400 })
    }

    let body: any = {}
    try {
      body = await request.json()
    } catch {
      // Optional body
    }

    // Quick regex sync mode
    if (body.mode === 'regex_sync') {
      const result = await incrementalQuizSync(quizId)
      return NextResponse.json({
        success: true,
        ...result
      })
    }

    return NextResponse.json({
      error: 'Unrecognized retag mode. Supported modes: "regex_sync". For AI semantic retagging, use /api/admin/quizzes/[id]/enrich with action: "tag_only".'
    }, { status: 400 })
  } catch (err: any) {
    console.error('Error in quiz retag route:', err)
    return NextResponse.json({ error: err.message || 'Retagging error' }, { status: 500 })
  }
}
