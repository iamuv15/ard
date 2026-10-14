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
 * Generate structured practical / clinical YouTube demo link
 */
function generateYouTubeDemoLink(term: string, category?: string | null): string | null {
  const termLower = term.toLowerCase()
  const catLower = (category || '').toLowerCase()

  const isDemo = PRACTICAL_DEMO_KEYWORDS.some(kw => termLower.includes(kw) || catLower.includes(kw))
  if (!isDemo) return null

  const query = `${cleanTermForWiki(term)} veterinary practical demonstration agriculture`
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
}

/**
 * Enrich a single concept term with media
 */
export async function enrichConceptTerm(
  term: string,
  category?: string | null
): Promise<EnrichedMediaResult> {
  const [wikiMedia, videoUrl] = await Promise.all([
    fetchWikimediaMedia(term, category),
    Promise.resolve(generateYouTubeDemoLink(term, category))
  ])

  return {
    imageUrl: wikiMedia?.imageUrl || null,
    thumbnailUrl: wikiMedia?.thumbnailUrl || null,
    imageCaption: wikiMedia?.imageCaption || null,
    sourceUrl: wikiMedia?.sourceUrl || null,
    videoUrl: videoUrl || null
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

