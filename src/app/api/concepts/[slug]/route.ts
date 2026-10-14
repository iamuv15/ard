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

    // Normalize correctAnswer on all returned practice questions to standardized uppercase
    if (concept.questions && Array.isArray(concept.questions)) {
      concept.questions = concept.questions.map(q => ({
        ...q,
        correctAnswer: (q.correctAnswer || '').trim().toUpperCase()
      }))
    }

    const { fetchWikimediaGallery, generatePrecisionYouTubeData, isImageTitleIrrelevant } = await import('@/lib/mediaEnrichment')

    // 1. Resolve Multi-Image Gallery or Single Image
    let galleryImages: Array<{ url: string; title: string; sourceUrl?: string }> = []

    if (concept.imageUrl) {
      if (concept.imageUrl.startsWith('[')) {
        try {
          const parsed = JSON.parse(concept.imageUrl)
          if (Array.isArray(parsed) && parsed.length > 0) {
            galleryImages = parsed.filter(item => item && item.url && !isImageTitleIrrelevant(item.url + ' ' + (item.title || '')))
            concept.imageUrl = galleryImages[0]?.url || null
            concept.thumbnailUrl = galleryImages[0]?.url || null
            concept.imageCaption = galleryImages[0]?.title || concept.term
            concept.sourceUrl = galleryImages[0]?.sourceUrl || null
          }
        } catch {
          galleryImages = []
        }
      }

      // Single image fallback if not JSON array
      if (galleryImages.length === 0 && concept.imageUrl) {
        const isBad = isImageTitleIrrelevant(
          `${concept.imageUrl} ${concept.imageCaption || ''} ${concept.thumbnailUrl || ''}`
        )
        if (isBad) {
          console.log(`[PURGE] Irrelevant image discarded for concept "${concept.term}": ${concept.imageUrl}`)
          await prisma.chapterConcept.update({
            where: { id: concept.id },
            data: { imageUrl: null, thumbnailUrl: null, imageCaption: null, sourceUrl: null }
          }).catch(err => console.warn('Failed to purge bad image from DB:', err?.message))
          concept.imageUrl = null
          concept.thumbnailUrl = null
          concept.imageCaption = null
          concept.sourceUrl = null
        } else {
          galleryImages = [
            {
              url: concept.imageUrl,
              title: concept.imageCaption || concept.term,
              sourceUrl: concept.sourceUrl || undefined
            }
          ]
        }
      }
    }

    // If no gallery images in DB, look up authentic Wikipedia article media
    if (galleryImages.length === 0) {
      try {
        galleryImages = await fetchWikimediaGallery(
          concept.term,
          concept.category,
          concept.subCategory,
          concept.chapter?.name
        )
        if (galleryImages.length > 0) {
          concept.imageUrl = galleryImages[0].url
          concept.thumbnailUrl = galleryImages[0].url
          concept.imageCaption = galleryImages[0].title
          concept.sourceUrl = galleryImages[0].sourceUrl || null
        }
      } catch (e) {
        console.warn('Failed to fetch gallery for', concept.term, e)
      }
    }

    // 2. Resolve Custom Video and Search Query or Automated Guidance
    let precisionVideo: any = null
    let customVideoUrl: string | null = null
    let customSearchQuery: string | null = null

    if (concept.videoUrl && concept.videoUrl.startsWith('{')) {
      try {
        const parsedVideo = JSON.parse(concept.videoUrl)
        customVideoUrl = parsedVideo.videoUrl || null
        customSearchQuery = parsedVideo.searchQuery || null
      } catch {
        customVideoUrl = concept.videoUrl
      }
    } else {
      customVideoUrl = concept.videoUrl
    }

    if (customVideoUrl || customSearchQuery) {
      const vMatch = customVideoUrl
        ? customVideoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/)
        : null
      const videoId = vMatch ? vMatch[1] : null
      const sQuery = customSearchQuery || `${concept.term} ${concept.subCategory || ''} veterinary demonstration ICAR`
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(sQuery)}`

      precisionVideo = {
        videoUrl: customVideoUrl || searchUrl,
        searchUrl,
        embedUrl: videoId ? `https://www.youtube-nocookie.com/embed/${videoId}?rel=0` : null,
        videoId,
        thumbnailUrl: videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null,
        videoCaption: `Custom practical demonstration for ${concept.term}.`,
        customSearchQuery: sQuery
      }
    } else {
      precisionVideo = await generatePrecisionYouTubeData(
        concept.term,
        concept.category,
        concept.subCategory,
        concept.chapter?.name,
        concept.examTraps
      )
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
