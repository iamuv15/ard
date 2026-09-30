import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params
    const id = parseInt(params.id, 10)
    const { cohort } = await request.json()

    if (isNaN(id) || !cohort) {
      return NextResponse.json({ error: 'Invalid ID or missing cohort' }, { status: 400 })
    }

    if (cohort !== 'ALPHA' && cohort !== 'BETA') {
      return NextResponse.json({ error: 'Invalid cohort value' }, { status: 400 })
    }

    const quiz = await prisma.quiz.update({
      where: { id },
      data: { cohort }
    })

    return NextResponse.json({ quiz })
  } catch (error: any) {
    console.error('Failed to update quiz cohort:', error)
    return NextResponse.json({ error: 'Failed to update cohort' }, { status: 500 })
  }
}
