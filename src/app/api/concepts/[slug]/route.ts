import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  request: Request,
  props: { params: Promise<{ slug: string }> }
) {
  try {
    const params = await props.params
    const slug = params.slug
    const { searchParams } = new URL(request.url)
    const chapterIdStr = searchParams.get('chapterId')

    const where: any = { slug }
    if (chapterIdStr) {
      const chapterId = parseInt(chapterIdStr, 10)
      if (!isNaN(chapterId)) where.chapterId = chapterId
    }

    const concept = await prisma.chapterConcept.findFirst({
      where,
      include: {
        chapter: {
          select: { id: true, name: true }
        },
        questions: {
          select: {
            id: true,
            questionText: true,
            optionA: true,
            optionB: true,
            optionC: true,
            optionD: true,
            optionE: true,
            correctAnswer: true,
            explanation: true,
            quiz: {
              select: { id: true, name: true }
            }
          },
          take: 10
        }
      }
    })

    if (!concept) {
      return NextResponse.json({ error: 'Concept not found' }, { status: 404 })
    }

    return NextResponse.json({ concept })
  } catch (error: any) {
    console.error('Error fetching concept by slug:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
