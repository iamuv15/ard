import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null
  const trimmed = url.trim()
  const match = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
  )
  return match ? match[1] : null
}

export async function POST(
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
      select: { id: true, term: true, subCategory: true, chapterId: true }
    })

    if (!concept) {
      return NextResponse.json({ error: 'Concept not found' }, { status: 404 })
    }

    const body = await request.json()
    const { videoUrl, searchQuery } = body

    let trimmedVideoUrl = (videoUrl || '').trim()
    let trimmedQuery = (searchQuery || '').trim()

    // Validate YouTube URL if provided
    let videoId: string | null = null
    if (trimmedVideoUrl) {
      videoId = extractYouTubeVideoId(trimmedVideoUrl)
      if (!videoId) {
        return NextResponse.json(
          { error: 'Please enter a valid YouTube video link (e.g. https://www.youtube.com/watch?v=... or https://youtu.be/...)' },
          { status: 400 }
        )
      }
      trimmedVideoUrl = `https://www.youtube.com/watch?v=${videoId}`
    }

    // Default search query if empty
    if (!trimmedQuery) {
      trimmedQuery = `${concept.term} ${concept.subCategory || ''} veterinary demonstration ICAR`
    }

    const storedValue = JSON.stringify({
      videoUrl: trimmedVideoUrl || null,
      searchQuery: trimmedQuery
    })

    const updated = await prisma.chapterConcept.update({
      where: { id: concept.id },
      data: {
        videoUrl: storedValue
      }
    })

    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(trimmedQuery)}`
    const embedUrl = videoId ? `https://www.youtube-nocookie.com/embed/${videoId}?rel=0` : null
    const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null

    return NextResponse.json({
      success: true,
      precisionVideo: {
        videoUrl: trimmedVideoUrl || searchUrl,
        searchUrl,
        embedUrl,
        videoId,
        thumbnailUrl,
        videoCaption: `Custom curated demonstration for ${concept.term}.`
      },
      message: 'Video settings saved successfully'
    })
  } catch (error: any) {
    console.error('Error saving custom video:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to save video settings' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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
      select: { id: true, term: true }
    })

    if (!concept) {
      return NextResponse.json({ error: 'Concept not found' }, { status: 404 })
    }

    // Reset videoUrl to null to return to automated precision query
    await prisma.chapterConcept.update({
      where: { id: concept.id },
      data: {
        videoUrl: null
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Reset video settings to automated defaults'
    })
  } catch (error: any) {
    console.error('Error resetting video settings:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to reset video settings' },
      { status: 500 }
    )
  }
}
