import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'
import { 
  generateChapterMindMap, 
  mineSingleMCQBatch, 
  synthesizeMindMapFromKeywords 
} from '@/lib/terminologyEngine'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

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

    const totalQuestions = await prisma.question.count({
      where: { quiz: { chapterId } }
    })

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
      totalQuestions,
      mindMap: chapter.mindMap,
      rawKeywords: chapter.mindMap?.rawKeywords || [],
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

    const fallbackApiKey = body.paidApiKey || body.fallbackApiKey

    // ACTION 0: Reset Raw Keywords pool (Optional)
    if (body.action === 'reset_keywords') {
      await prisma.chapterMindMap.upsert({
        where: { chapterId },
        create: {
          chapterId,
          rawKeywords: [],
          treeData: { categories: [], crossBranchEdges: [], allKeywords: [] },
          lastSyncAt: new Date()
        },
        update: {
          rawKeywords: [],
          treeData: { categories: [], crossBranchEdges: [], allKeywords: [] },
          lastSyncAt: new Date()
        }
      })
      return NextResponse.json({
        success: true,
        message: 'Keyword pool reset successfully',
        rawKeywords: []
      })
    }

    // ACTION 1: Progressive Mining of a single MCQ batch (~2 seconds)
    if (body.action === 'mine_batch') {
      const result = await mineSingleMCQBatch({
        chapterId,
        batchIndex: Number(body.batchIndex) || 0,
        batchSize: Number(body.batchSize) || 25,
        apiKey: body.apiKey,
        fallbackApiKey
      })
      return NextResponse.json({
        success: true,
        ...result
      })
    }

    // ACTION 2: Synthesize Master Mind Map from accumulated keywords (~12-18 seconds with 10k thinking)
    if (body.action === 'synthesize') {
      const mindMap = await synthesizeMindMapFromKeywords({
        chapterId,
        keywords: body.keywords,
        apiKey: body.apiKey,
        fallbackApiKey
      })
      return NextResponse.json({
        success: true,
        chapterId,
        mindMap,
        totalKeywordsExtracted: mindMap.allKeywords.length
      })
    }

    // ACTION 3: Standard quick 1-click generation (samples up to 180 MCQs)
    const mindMap = await generateChapterMindMap(chapterId, {
      apiKey: body.apiKey,
      fallbackApiKey,
      maxQuestionsSample: body.maxQuestionsSample || 180
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
