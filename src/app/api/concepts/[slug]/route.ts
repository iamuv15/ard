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

    const { fetchWikimediaGallery, generatePrecisionYouTubeData } = await import('@/lib/mediaEnrichment')

    // Generate precision video guidance
    const precisionVideo = await generatePrecisionYouTubeData(
      concept.term,
      concept.category,
      concept.subCategory,
      concept.examTraps
    )

    // Fetch multiple images from Wikimedia
    let galleryImages: Array<{ url: string; title: string; sourceUrl?: string }> = []
    try {
      galleryImages = await fetchWikimediaGallery(concept.term, concept.category)
    } catch (e) {
      console.warn('Failed to fetch gallery for', concept.term, e)
    }

    // Ensure primary image is at index 0 if available
    if (concept.imageUrl) {
      const alreadyHas = galleryImages.some(img => img.url === concept.imageUrl)
      if (!alreadyHas) {
        galleryImages.unshift({
          url: concept.imageUrl,
          title: concept.imageCaption || concept.term,
          sourceUrl: concept.sourceUrl || undefined
        })
      }
    }

    return NextResponse.json({
      concept,
      galleryImages,
      precisionVideo
    })
  } catch (error: any) {
    console.error('Error fetching concept by slug:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
