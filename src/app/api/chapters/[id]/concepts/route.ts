import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params
    const chapterId = parseInt(params.id, 10)
    if (isNaN(chapterId)) {
      return NextResponse.json({ error: 'Invalid chapter ID' }, { status: 400 })
    }

    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        mindMap: true,
        concepts: {
          where: { isPublished: true },
          include: {
            _count: {
              select: { questions: true }
            }
          },
          orderBy: [{ category: 'asc' }, { term: 'asc' }]
        }
      }
    })

    if (!chapter) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 })
    }

    return NextResponse.json({
      chapter: {
        id: chapter.id,
        name: chapter.name
      },
      mindMap: chapter.mindMap,
      concepts: chapter.concepts
    })
  } catch (error: any) {
    console.error('Error fetching chapter concepts:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
