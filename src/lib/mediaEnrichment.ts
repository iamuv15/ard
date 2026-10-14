/**
 * Zero-Cost Media Enrichment Engine for Agriscience & Veterinary Concepts
 * Uses free public Wikimedia REST API (CC/Public Domain) and YouTube clinical/field demo links.
 * 100% Free - $0 API cost, zero Google Search Grounding fees.
 */

export interface EnrichedMediaResult {
  imageUrl?: string | null
  thumbnailUrl?: string | null
  imageCaption?: string | null
  sourceUrl?: string | null
  videoUrl?: string | null
}

// Procedural / Clinical / Tool keywords that benefit heavily from practical field demonstration videos
const PRACTICAL_DEMO_KEYWORDS = [
  'castrat', 'burdizzo', 'dehorn', 'disbud', 'docking', 'shearing',
  'mastitis', 'california mastitis test', 'cmt', 'artificial insemination',
  'silage', 'hay', 'milking', 'dipping', 'vaccin', 'tagging', 'tattoo',
  'branding', 'candling', 'incubator', 'brooder', 'strip cup', 'teat dip',
  'drenching', 'hoof trimming', 'insemination', 'recto-vaginal', 'stripping'
]

/**
 * Clean concept terms for Wikipedia lookup:
 * Removes exam punctuation, parenthetical qualifiers, and extra fluff
 */
function cleanTermForWiki(term: string): string {
  return term
    .replace(/\(.*?\)/g, '') // remove (e.g. breed type)
    .replace(/\[.*?\]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
}

async function fetchSummaryForTitle(title: string): Promise<{
  imageUrl: string
  thumbnailUrl: string
  imageCaption: string
  sourceUrl: string
  isGeoCity: boolean
} | null> {
  const encoded = encodeURIComponent(title.replace(/\s+/g, '_'))
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'AgriscienceExamPrep/1.0 (educational competitive exam platform)'
      }
    })
    if (res.ok) {
      const data = await res.json()
      if (data.thumbnail?.source) {
        const desc = (data.description || '').toLowerCase()
        const isGeoCity = desc.includes('city') || desc.includes('district') || desc.includes('province') || desc.includes('human settlement') || desc.includes('town')
        return {
          imageUrl: data.originalimage?.source || data.thumbnail.source,
          thumbnailUrl: data.thumbnail.source,
          imageCaption: data.description || `${data.title} (${data.description || 'Reference image'})`,
          sourceUrl: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encoded}`,
          isGeoCity
        }
      }
    }
  } catch (err: any) {
    console.warn(`Wikimedia lookup error for "${title}":`, err?.message)
  }
  return null
}

/**
 * Query Wikipedia REST API for public domain / Creative Commons images
 */
async function fetchWikimediaMedia(
  term: string,
  category?: string | null
): Promise<{
  imageUrl?: string
  thumbnailUrl?: string
  imageCaption?: string
  sourceUrl?: string
} | null> {
  const cleanTerm = cleanTermForWiki(term)
  if (!cleanTerm) return null

  const isBreedContext = (category || '').toLowerCase().includes('breed') || (category || '').toLowerCase().includes('livestock')

  // 1. Direct summary lookup
  let hit = await fetchSummaryForTitle(cleanTerm)

  // 2. Disambiguation: If direct hit is a city/district or we are in breed context and hit is ambiguous, try specific breed suffixes
  if (!hit || hit.isGeoCity || (isBreedContext && hit.isGeoCity)) {
    const breedCandidates = [
      `${cleanTerm} cattle`,
      `${cleanTerm} buffalo`,
      `${cleanTerm} sheep`,
      `${cleanTerm} goat`,
      `${cleanTerm} breed`
    ]
    for (const candidate of breedCandidates) {
      const candidateHit = await fetchSummaryForTitle(candidate)
      if (candidateHit && !candidateHit.isGeoCity) {
        hit = candidateHit
        break
      }
    }
  }

  if (hit && !hit.isGeoCity) {
    return {
      imageUrl: hit.imageUrl,
      thumbnailUrl: hit.thumbnailUrl,
      imageCaption: hit.imageCaption,
      sourceUrl: hit.sourceUrl
    }
  }

  // 3. Search fallback
  try {
    const searchQuery = isBreedContext ? `${cleanTerm} breed agriculture` : cleanTerm
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&format=json&origin=*`
    const searchRes = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'AgriscienceExamPrep/1.0 (educational competitive exam platform)'
      }
    })

    if (searchRes.ok) {
      const searchData = await searchRes.json()
      const hits = searchData.query?.search || []
      for (const h of hits.slice(0, 3)) {
        if (h?.title) {
          const searchHit = await fetchSummaryForTitle(h.title)
          if (searchHit && !searchHit.isGeoCity) {
            return {
              imageUrl: searchHit.imageUrl,
              thumbnailUrl: searchHit.thumbnailUrl,
              imageCaption: searchHit.imageCaption,
              sourceUrl: searchHit.sourceUrl
            }
          }
        }
      }
    }
  } catch (err: any) {
    console.warn(`Wikimedia search fallback error for "${term}":`, err?.message)
  }

  return hit && !hit.isGeoCity ? hit : null
}

/**
 * Resolve top real YouTube video ID from YouTube search HTML (zero cost, no API key required)
 */
export async function resolveYouTubeVideoId(query: string): Promise<string | null> {
  try {
    const res = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    })
    if (!res.ok) return null
    const text = await res.text()
    const match = text.match(/"videoId":"([a-zA-Z0-9_-]{11})"/)
    return match ? match[1] : null
  } catch (err: any) {
    console.warn('Failed to resolve YouTube video ID for query:', query, err?.message)
    return null
  }
}

/**
 * Generate precision practical / clinical YouTube demo link with AI-curated viewing guidance
 */
export async function generatePrecisionYouTubeData(
  term: string,
  category?: string | null,
  subCategory?: string | null,
  examTraps?: string | null
): Promise<{
  videoUrl: string
  embedUrl: string | null
  videoId: string | null
  thumbnailUrl: string | null
  videoCaption: string
}> {
  const cleanTerm = cleanTermForWiki(term)
  const catLower = (category || '').toLowerCase()
  const subLower = (subCategory || '').toLowerCase()

  let querySuffix = 'agriculture veterinary demonstration ICAR'
  let caption = `Comprehensive practical demonstration and exam guide for ${term}.`

  if (catLower.includes('breed') || subLower.includes('breed') || catLower.includes('livestock')) {
    querySuffix = 'breed physical characteristics identification ICAR NDRI dairy demonstration'
    caption = `Observe key physical conformation, head/horn shape, dewlap, and distinctive breed identification marks.`
    if (examTraps && examTraps.toLowerCase().includes('forehead')) {
      caption = `Notice the prominent forehead shape and ear conformation highlighted in exam trap questions.`
    } else if (examTraps && examTraps.toLowerCase().includes('fat')) {
      caption = `Notice the coat color, body frame, and milk characteristics contrasted in competitive exams.`
    }
  } else if (catLower.includes('disease') || subLower.includes('disease') || catLower.includes('health') || catLower.includes('patholog')) {
    querySuffix = 'clinical signs symptoms veterinary diagnosis post mortem ICAR'
    caption = `Observe characteristic clinical symptoms, diagnostic tests, and disease lesions tested in exams.`
  } else if (catLower.includes('reproduct') || subLower.includes('reproduct') || catLower.includes('oestrus') || catLower.includes('physiol')) {
    querySuffix = 'veterinary physiology lecture animation clinical demonstration'
    caption = `Educational demonstration of reproductive mechanisms, hormonal cycles, and management techniques.`
  } else if (catLower.includes('nutrition') || subLower.includes('feed') || subLower.includes('fodder')) {
    querySuffix = 'cattle feed formulation silage hay making livestock nutrition'
    caption = `Practical demonstration of feed preparation, nutrient evaluation, and livestock feeding.`
  }

  const query = `${cleanTerm} ${querySuffix}`
  const videoId = await resolveYouTubeVideoId(query)

  const videoUrl = videoId
    ? `https://www.youtube.com/watch?v=${videoId}`
    : `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`

  const embedUrl = videoId
    ? `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`
    : null

  const thumbnailUrl = videoId
    ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    : null

  return { videoUrl, embedUrl, videoId, thumbnailUrl, videoCaption: caption }
}

/**
 * Fetch multiple authentic Wikimedia Commons images for a concept
 */
export async function fetchWikimediaGallery(
  term: string,
  category?: string | null
): Promise<Array<{ url: string; title: string; sourceUrl?: string }>> {
  const cleanTerm = cleanTermForWiki(term)
  if (!cleanTerm) return []

  const isBreed = (category || '').toLowerCase().includes('breed') || (category || '').toLowerCase().includes('livestock')
  const searchQuery = isBreed ? `${cleanTerm} cattle OR ${cleanTerm} breed OR ${cleanTerm}` : cleanTerm

  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(searchQuery)}&gsrlimit=6&prop=imageinfo&iiprop=url|mime&format=json&origin=*`

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'AgriscienceExamPrep/1.0 (educational competitive exam platform)'
      }
    })

    if (!res.ok) return []

    const data = await res.json()
    const pages = data.query?.pages || {}
    const gallery: Array<{ url: string; title: string; sourceUrl?: string }> = []

    for (const pageId of Object.keys(pages)) {
      const page = pages[pageId]
      const info = page.imageinfo?.[0]
      if (info?.url) {
        const mime = (info.mime || '').toLowerCase()
        const title = (page.title || '').replace(/^File:/i, '').replace(/\.[^/.]+$/, '')
        const titleLower = title.toLowerCase()

        // Exclude icons, maps, flags, coats of arms, and non-photos
        if (
          mime.includes('jpeg') || mime.includes('png') || mime.includes('webp')
        ) {
          if (
            !titleLower.includes('icon') &&
            !titleLower.includes('logo') &&
            !titleLower.includes('flag') &&
            !titleLower.includes('map') &&
            !titleLower.includes('coat_of_arms')
          ) {
            gallery.push({
              url: info.url,
              title: title.replace(/_/g, ' '),
              sourceUrl: info.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`
            })
          }
        }
      }
    }

    return gallery.slice(0, 4)
  } catch (err: any) {
    console.warn(`Wikimedia gallery lookup error for "${term}":`, err?.message)
    return []
  }
}

/**
 * Generate structured practical / clinical YouTube demo link
 */
async function generateYouTubeDemoLink(term: string, category?: string | null): Promise<string | null> {
  const data = await generatePrecisionYouTubeData(term, category)
  return data.videoUrl
}

/**
 * Enrich a single concept term with media
 */
export async function enrichConceptTerm(
  term: string,
  category?: string | null
): Promise<EnrichedMediaResult> {
  const [wikiMedia, videoData] = await Promise.all([
    fetchWikimediaMedia(term, category),
    generatePrecisionYouTubeData(term, category)
  ])

  return {
    imageUrl: wikiMedia?.imageUrl || null,
    thumbnailUrl: wikiMedia?.thumbnailUrl || null,
    imageCaption: wikiMedia?.imageCaption || null,
    sourceUrl: wikiMedia?.sourceUrl || null,
    videoUrl: videoData?.videoUrl || null
  }
}

/**
 * Enrich all or un-enriched concepts in a chapter with Wikimedia photos and YouTube demo links
 */
export async function enrichChapterConceptsMedia(
  chapterId: number,
  options?: { limit?: number; forceRecheck?: boolean }
) {
  const prisma = (await import('@/lib/prisma')).default

  const whereClause: any = { chapterId }
  if (!options?.forceRecheck) {
    whereClause.imageUrl = null
  }

  const concepts = await prisma.chapterConcept.findMany({
    where: whereClause,
    select: { id: true, term: true, category: true, imageUrl: true, videoUrl: true },
    take: options?.limit || 100,
    orderBy: { id: 'asc' }
  })

  let imagesFound = 0
  let videosGenerated = 0

  for (const c of concepts) {
    const media = await enrichConceptTerm(c.term, c.category)
    const updateData: any = {}

    if (media.imageUrl) {
      updateData.imageUrl = media.imageUrl
      updateData.thumbnailUrl = media.thumbnailUrl
      updateData.imageCaption = media.imageCaption
      updateData.sourceUrl = media.sourceUrl
      imagesFound++
    }

    if (media.videoUrl) {
      updateData.videoUrl = media.videoUrl
      videosGenerated++
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.chapterConcept.update({
        where: { id: c.id },
        data: updateData
      })
    }

    // Gentle pacing (50ms) to be polite to Wikipedia servers
    await new Promise(resolve => setTimeout(resolve, 50))
  }

  return {
    totalScanned: concepts.length,
    imagesFound,
    videosGenerated
  }
}

