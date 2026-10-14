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

    const { fetchWikimediaGallery, generatePrecisionYouTubeData, isImageTitleIrrelevant } = await import('@/lib/mediaEnrichment')

    // Purge irrelevant / blacklisted images (e.g. heat sinks, human clinics, engine parts)
    if (concept.imageUrl) {
      const isBad = isImageTitleIrrelevant(
        `${concept.imageUrl} ${concept.imageCaption || ''} ${concept.thumbnailUrl || ''}`
      )
      if (isBad) {
        console.log(`[PURGE] Irrelevant image discarded for concept "${concept.term}": ${concept.imageUrl}`)
        await prisma.chapterConcept.update({
          where: { id: concept.id },
          data: {
            imageUrl: null,
            thumbnailUrl: null,
            imageCaption: null,
            sourceUrl: null
          }
        }).catch(err => console.warn('Failed to purge bad image from DB:', err?.message))
        concept.imageUrl = null
        concept.thumbnailUrl = null
        concept.imageCaption = null
        concept.sourceUrl = null
      }
    }

    // Generate precision video guidance with full academic context
    const precisionVideo = await generatePrecisionYouTubeData(
      concept.term,
      concept.category,
      concept.subCategory,
      concept.chapter?.name,
      concept.examTraps
    )

    // Fetch multiple images from Wikimedia with biological/agricultural context
    let galleryImages: Array<{ url: string; title: string; sourceUrl?: string }> = []
    try {
      galleryImages = await fetchWikimediaGallery(
        concept.term,
        concept.category,
        concept.subCategory,
        concept.chapter?.name
      )
    } catch (e) {
      console.warn('Failed to fetch gallery for', concept.term, e)
    }

    // Ensure primary image is at index 0 if valid, or self-heal DB if authentic gallery found
    if (concept.imageUrl) {
      const alreadyHas = galleryImages.some(img => img.url === concept.imageUrl)
      if (!alreadyHas) {
        galleryImages.unshift({
          url: concept.imageUrl,
          title: concept.imageCaption || concept.term,
          sourceUrl: concept.sourceUrl || undefined
        })
      }
    } else if (galleryImages.length > 0) {
      const topImg = galleryImages[0]
      await prisma.chapterConcept.update({
        where: { id: concept.id },
        data: {
          imageUrl: topImg.url,
          thumbnailUrl: topImg.url,
          imageCaption: topImg.title,
          sourceUrl: topImg.sourceUrl || null
        }
      }).catch(err => console.warn('Failed to save self-healed image:', err?.message))
      concept.imageUrl = topImg.url
      concept.thumbnailUrl = topImg.url
      concept.imageCaption = topImg.title
      concept.sourceUrl = topImg.sourceUrl || null
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
