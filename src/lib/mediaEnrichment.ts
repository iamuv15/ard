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

// Words/phrases that indicate a media asset is completely irrelevant to agriculture/veterinary science
export const IRRELEVANT_IMAGE_WORDS = [
  'heat sink', 'heatsink', 'heat exchanger', 'radiator', 'chaleur', 'summer heat',
  'fillette', 'girl', 'child', 'infant', 'human', 'car', 'motor', 'engine',
  'quarry', 'abandoned', 'factory', 'industrial', 'machine part', 'tooling',
  'street', 'building', 'paris', 'model', 'portrait of a woman', 'actor', 'actress',
  'automobile', 'motorcycle', 'aviation', 'airplane', 'railway', 'locomotive',
  'insemination of women', 'donor sperm', 'sperm bank human', 'ivf clinic',
  'fertility clinic'
]

/**
 * Gatekeeper test: returns true if the title, filename, or caption contains blacklisted non-agricultural words
 */
export function isImageTitleIrrelevant(titleOrUrl: string): boolean {
  if (!titleOrUrl) return false
  const lower = titleOrUrl.toLowerCase().replace(/[_/.-]/g, ' ')
  return IRRELEVANT_IMAGE_WORDS.some(bad => lower.includes(bad))
}

/**
 * Clean concept terms for Wikipedia / Wikimedia lookup:
 * Removes exam punctuation, parenthetical qualifiers, and extra fluff
 */
function cleanTermForWiki(term: string): string {
  return term
    .replace(/\(.*?\)/g, '') // remove (e.g. breed type)
    .replace(/\[.*?\]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
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
 * Ground media queries with biological and agricultural context to avoid homonym confusion
 */
export function buildContextualMediaSearchQuery(
  term: string,
  category?: string | null,
  subCategory?: string | null,
  chapterName?: string | null
): string {
  const cleanTerm = cleanTermForWiki(term)
  const tLower = cleanTerm.toLowerCase()
  const catLower = (category || '').toLowerCase()
  const subLower = (subCategory || '').toLowerCase()
  const chapLower = (chapterName || '').toLowerCase()

  const isLivestock =
    chapLower.includes('animal') ||
    chapLower.includes('husbandry') ||
    chapLower.includes('veterinary') ||
    catLower.includes('livestock') ||
    catLower.includes('breed') ||
    subLower.includes('breed')

  if (isLivestock) {
    // 1. Specific buffalo breeds
    if (
      subLower.includes('buffalo') ||
      tLower.includes('murrah') ||
      tLower.includes('surti') ||
      tLower.includes('jafrabadi') ||
      tLower.includes('bhadawari') ||
      tLower.includes('nili ravi') ||
      tLower.includes('mehsana')
    ) {
      return `${cleanTerm} buffalo`
    }

    // 2. Specific goat breeds
    if (
      subLower.includes('goat') ||
      tLower.includes('jamunapari') ||
      tLower.includes('barbari') ||
      tLower.includes('black bengal') ||
      tLower.includes('beetal') ||
      tLower.includes('sirohi')
    ) {
      return `${cleanTerm} goat`
    }

    // 3. Specific sheep breeds
    if (
      subLower.includes('sheep') ||
      tLower.includes('merino') ||
      tLower.includes('nellore') ||
      tLower.includes('deccani') ||
      tLower.includes('rambouillet')
    ) {
      return `${cleanTerm} sheep`
    }

    // 4. Specific poultry / chicken breeds
    if (
      subLower.includes('poultry') ||
      subLower.includes('chicken') ||
      subLower.includes('avian') ||
      tLower.includes('aseel') ||
      tLower.includes('kadaknath') ||
      tLower.includes('leghorn')
    ) {
      return `${cleanTerm} chicken`
    }

    // 5. Reproduction & Oestrus Cycle: ground to domestic livestock cycle
    if (
      subLower.includes('oestrus') ||
      subLower.includes('estrus') ||
      subLower.includes('cycle') ||
      subLower.includes('hormone') ||
      tLower.includes('estrus') ||
      tLower.includes('oestrus') ||
      tLower.includes('proestrum') ||
      tLower.includes('diestrum')
    ) {
      return 'estrous cycle'
    }

    // 6. Artificial Insemination & Breeding Technologies
    if (
      subLower.includes('artificial') ||
      tLower.includes('insemination') ||
      subLower.includes('technolog')
    ) {
      return 'artificial insemination cattle'
    }

    // 7. Veterinary procedures & tools
    if (
      tLower.includes('burdizzo') ||
      tLower.includes('castrat') ||
      tLower.includes('dehorn') ||
      tLower.includes('disbud') ||
      tLower.includes('docking')
    ) {
      return `${cleanTerm} veterinary`
    }

    // 8. Livestock diseases
    if (
      catLower.includes('disease') ||
      subLower.includes('disease') ||
      catLower.includes('health') ||
      tLower.includes('mastitis')
    ) {
      return `${cleanTerm} cow`
    }

    // 9. Cattle breeds
    if (catLower.includes('breed') || subLower.includes('breed')) {
      return `${cleanTerm} cattle`
    }

    // Default livestock fallback
    return `${cleanTerm} cattle`
  }

  // General Agriculture / Crop / Soil context
  return `${cleanTerm} ${subCategory || ''} ${chapterName || ''}`.trim()
}

/**
 * Generate precision practical / clinical YouTube demo link with AI-curated viewing guidance
 */
export async function generatePrecisionYouTubeData(
  term: string,
  category?: string | null,
  subCategory?: string | null,
  chapterName?: string | null,
  examTraps?: string | null
): Promise<{
  videoUrl: string
  searchUrl: string
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
  } else if (catLower.includes('reproduct') || subLower.includes('reproduct') || catLower.includes('oestrus') || catLower.includes('physiol') || subLower.includes('cycle')) {
    querySuffix = 'cattle veterinary reproductive physiology lecture animation clinical demonstration'
    caption = `Educational demonstration of reproductive mechanisms, hormonal cycles, and management techniques in cattle.`
  } else if (catLower.includes('nutrition') || subLower.includes('feed') || subLower.includes('fodder')) {
    querySuffix = 'cattle feed formulation silage hay making livestock nutrition'
    caption = `Practical demonstration of feed preparation, nutrient evaluation, and livestock feeding.`
  }

  const query = `${cleanTerm} ${subCategory ? subCategory + ' ' : ''}${querySuffix}`
  const videoId = await resolveYouTubeVideoId(query)

  const videoUrl = videoId
    ? `https://www.youtube.com/watch?v=${videoId}`
    : `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`

  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`

  const embedUrl = videoId
    ? `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`
    : null

  const thumbnailUrl = videoId
    ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    : null

  return { videoUrl, searchUrl, embedUrl, videoId, thumbnailUrl, videoCaption: caption }
}

/**
 * Fetch multiple authentic Wikimedia Commons images for a concept
 */
export async function fetchWikimediaGallery(
  term: string,
  category?: string | null,
  subCategory?: string | null,
  chapterName?: string | null
): Promise<Array<{ url: string; title: string; sourceUrl?: string }>> {
  const cleanTerm = cleanTermForWiki(term)
  if (!cleanTerm) return []

  const searchQuery = buildContextualMediaSearchQuery(term, category, subCategory, chapterName)
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(searchQuery)}&gsrlimit=10&prop=imageinfo&iiprop=url|mime&format=json&origin=*`

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'AgriscienceExamPrep/1.0 (educational platform; contact: support@agriscienceprep.edu)'
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

        // 1. Ensure file is a supported image format (excluding pdf, tiff, webm)
        if (mime.includes('jpeg') || mime.includes('png') || mime.includes('webp')) {
          // 2. Gatekeeper: Reject blacklisted irrelevant terms (heat sinks, children, radiators, industrial parts, human IVF)
          if (isImageTitleIrrelevant(titleLower) || isImageTitleIrrelevant(info.url)) {
            continue
          }

          // 3. Exclude icons, maps, flags, logos, coats of arms
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
        'User-Agent': 'AgriscienceExamPrep/1.0 (educational competitive exam platform; contact: support@agriscienceprep.edu)'
      }
    })
    if (res.ok) {
      const data = await res.json()
      if (data.thumbnail?.source) {
        const desc = (data.description || '').toLowerCase()
        const titleLower = (data.title || '').toLowerCase()
        const isGeoCity = desc.includes('city') || desc.includes('district') || desc.includes('province') || desc.includes('human settlement') || desc.includes('town')
        
        // Gatekeeper check: Reject irrelevant matches from summary
        if (isImageTitleIrrelevant(titleLower + ' ' + desc + ' ' + (data.thumbnail.source || ''))) {
          return null
        }

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

  // 2. Disambiguation: If direct hit is a city/district or we are in breed context, try specific breed suffixes
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
        'User-Agent': 'AgriscienceExamPrep/1.0 (educational competitive exam platform; contact: support@agriscienceprep.edu)'
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
 * Enrich a single concept term with media
 */
export async function enrichConceptTerm(
  term: string,
  category?: string | null,
  subCategory?: string | null,
  chapterName?: string | null,
  examTraps?: string | null
): Promise<EnrichedMediaResult> {
  const [wikiMedia, videoData] = await Promise.all([
    fetchWikimediaMedia(term, category),
    generatePrecisionYouTubeData(term, category, subCategory, chapterName, examTraps)
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
    include: {
      chapter: {
        select: { name: true }
      }
    },
    take: options?.limit || 100,
    orderBy: { id: 'asc' }
  })

  let imagesFound = 0
  let videosGenerated = 0

  for (const c of concepts) {
    const media = await enrichConceptTerm(c.term, c.category, c.subCategory, c.chapter?.name, c.examTraps)
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
