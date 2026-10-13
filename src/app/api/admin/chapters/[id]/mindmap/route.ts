import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'
import { generateChapterMindMap } from '@/lib/terminologyEngine'

async function checkAdminAuth() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('admin_session')
  return sessionCookie && (sessionCookie.value === 'true' || sessionCookie.value === 'authenticated')
}

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
        _count: {
          select: { concepts: true }
        }
      }
    })

    if (!chapter) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 })
    }

    const concepts = await prisma.chapterConcept.findMany({
      where: { chapterId },
      select: {
        id: true,
        term: true,
        slug: true,
        category: true,
        subCategory: true,
        _count: { select: { questions: true } }
      },
      orderBy: { term: 'asc' }
    })

    return NextResponse.json({
      chapterId: chapter.id,
      chapterName: chapter.name,
      mindMap: chapter.mindMap,
      conceptCount: chapter._count.concepts,
      existingConcepts: concepts
    })
  } catch (error: any) {
    console.error('Error fetching chapter mindmap:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
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
    const chapterId = parseInt(params.id, 10)
    if (isNaN(chapterId)) {
      return NextResponse.json({ error: 'Invalid chapter ID' }, { status: 400 })
    }

    let body: any = {}
    try {
      body = await request.json()
    } catch {
      // Optional body
    }

    // STEP 1: Generate Mind Map with thinking enabled (crucial structural reasoning)
    const mindMap = await generateChapterMindMap(chapterId, {
      apiKey: body.apiKey,
      maxQuestionsSample: body.maxQuestionsSample || 120
    })

    return NextResponse.json({
      success: true,
      chapterId,
      mindMap,
      totalKeywordsExtracted: mindMap.allKeywords.length
    })
  } catch (error: any) {
    console.error('Error generating chapter mindmap:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
