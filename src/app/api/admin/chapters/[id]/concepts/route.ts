import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'
import { generateConceptCapsulesBatch } from '@/lib/terminologyEngine'

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

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const query = searchParams.get('q')

    const where: any = { chapterId }
    if (category) {
      where.category = category
    }
    if (query) {
      where.OR = [
        { term: { contains: query, mode: 'insensitive' } },
        { definition: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } }
      ]
    }

    const concepts = await prisma.chapterConcept.findMany({
      where,
      include: {
        _count: {
          select: { questions: true }
        }
      },
      orderBy: [{ category: 'asc' }, { term: 'asc' }]
    })

    return NextResponse.json({ concepts })
  } catch (error: any) {
    console.error('Error listing concepts:', error)
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

    const body = await request.json()
    const { keywords, category, subCategory, apiKey } = body

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json({ error: 'Keywords array is required' }, { status: 400 })
    }

    if (!category) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 })
    }

    // Generate capsules in small chunk with THINKING OFF (zero reasoning token bloat)
    const capsules = await generateConceptCapsulesBatch({
      chapterId,
      keywords: keywords.slice(0, 5), // Keep batch small for fast response and Vercel timeout safety
      category,
      subCategory,
      apiKeyOverride: apiKey
    })

    return NextResponse.json({
      success: true,
      generatedCount: capsules.length,
      capsules
    })
  } catch (error: any) {
    console.error('Error generating concept capsules:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
