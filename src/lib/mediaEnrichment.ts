/**
 * Zero-Cost Verified Media Enrichment Engine for Agriscience & Veterinary Concepts
 * Uses Wikipedia Encyclopedia Article Infobox REST API (CC / Public Domain)
 * and YouTube practical demonstration links.
 * 100% Free - $0 API cost, zero Google Search Grounding fees.
 */

export interface EnrichedMediaResult {
  imageUrl?: string | null
  thumbnailUrl?: string | null
  imageCaption?: string | null
  sourceUrl?: string | null
  videoUrl?: string | null
}

// Words/phrases in filenames or captions indicating non-agricultural/irrelevant files
export const IRRELEVANT_IMAGE_WORDS = [
  'heat sink', 'heatsink', 'heat exchanger', 'radiator', 'chaleur', 'summer heat',
  'fillette', 'girl', 'child', 'infant', 'human', 'car', 'motor', 'engine',
  'quarry', 'abandoned', 'factory', 'industrial', 'machine part', 'tooling',
  'street', 'building', 'paris', 'model', 'portrait of a woman', 'actor', 'actress',
  'automobile', 'motorcycle', 'aviation', 'airplane', 'railway', 'locomotive',
  'insemination of women', 'donor sperm', 'sperm bank human', 'ivf clinic',
  'fertility clinic', 'mosque', 'meczet', 'temple', 'church', 'garlic', 'onion'
]

// Non-agricultural Wikipedia article descriptions to strictly reject
export const BAD_WIKI_DESCRIPTIONS = [
  'city', 'district', 'town', 'village', 'human settlement', 'municipality',
  'mosque', 'temple', 'church', 'building', 'street', 'neighbourhood',
  'film', 'actor', 'actress', 'album', 'song', 'person', 'politician',
  'topics referred to by the same term', 'disambiguation', 'in vitro fertilization'
]

/**
 * Gatekeeper test: returns true if the title, filename, or caption contains blacklisted non-agricultural words
 */
export function isImageTitleIrrelevant(titleOrUrl: string): boolean {
  if (!titleOrUrl) return false
  // Protect community uploaded images
  if (titleOrUrl.startsWith('/uploads/')) return false
  const lower = titleOrUrl.toLowerCase().replace(/[_/.-]/g, ' ')
  return IRRELEVANT_IMAGE_WORDS.some(bad => lower.includes(bad))
}

/**
 * Clean concept terms for Wikipedia lookup:
 * Removes exam punctuation, parenthetical qualifiers, and extra fluff
 */
export function cleanTermForWiki(term: string): string {
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
  const chapLower = (chapterName || '').toLowerCase()

  const isSoilContext = chapLower.includes('soil') || catLower.includes('soil') || catLower.includes('rock') || catLower.includes('mineral') || catLower.includes('texture') || catLower.includes('water') || catLower.includes('erosion') || catLower.includes('fertili') || catLower.includes('nutrient') || catLower.includes('tillage')

  let querySuffix = 'agriculture veterinary demonstration ICAR'
  let caption = `Comprehensive practical demonstration and exam guide for ${term}.`

  if (isSoilContext) {
    if (catLower.includes('rock') || catLower.includes('mineral') || catLower.includes('weathering') || catLower.includes('pedolog') || subLower.includes('mineral')) {
      querySuffix = 'soil science pedology soil profile horizons rocks minerals geology practical ICAR'
      caption = `Observe morphological characteristics, horizon differentiation, and mineral weathering properties.`
    } else if (catLower.includes('physical') || catLower.includes('texture') || catLower.includes('structure') || catLower.includes('density') || subLower.includes('texture')) {
      querySuffix = 'soil physical properties texture hydrometer method bulk density Stokes law ICAR lab'
      caption = `Practical laboratory determination of soil physical properties, texture analysis, and soil structure.`
    } else if (catLower.includes('water') || catLower.includes('moisture') || catLower.includes('tensiometer') || subLower.includes('moisture')) {
      querySuffix = 'soil moisture measurement tensiometer neutron probe pressure plate apparatus ICAR'
      caption = `Practical demonstration of soil moisture estimation instruments and soil-water energy relationships.`
    } else if (catLower.includes('problem') || catLower.includes('salin') || catLower.includes('sodic') || catLower.includes('alkali') || catLower.includes('acid') || subLower.includes('salin')) {
      querySuffix = 'saline sodic alkaline acid soil reclamation gypsum requirement leaching ICAR'
      caption = `Field reclamation techniques, soil amendments (gypsum/lime application), and salt-affected soil management.`
    } else if (catLower.includes('nutrient') || catLower.includes('fertilizer') || catLower.includes('manure') || subLower.includes('nutrient')) {
      querySuffix = 'plant nutrient deficiency symptoms leaf diagnosis nitrogen phosphorus potassium fertilizers ICAR'
      caption = `Visual identification of nutrient deficiency symptoms on indicator crops and fertilizer applications.`
    } else if (catLower.includes('erosion') || catLower.includes('conservation') || catLower.includes('watershed') || subLower.includes('erosion')) {
      querySuffix = 'soil erosion control contour bunding terracing watershed management agriscience'
      caption = `Demonstration of soil and water conservation structures, bunding, and erosion mechanics.`
    } else if (catLower.includes('tillage') || catLower.includes('tilth') || catLower.includes('puddl') || subLower.includes('tillage')) {
      querySuffix = 'primary secondary tillage implements plough puddler conservation tillage agronomy'
      caption = `Operation of tillage implements, seedbed preparation, and conservation tillage systems.`
    } else if (catLower.includes('colloid') || catLower.includes('chemist') || catLower.includes('clay') || catLower.includes('mineral')) {
      querySuffix = 'soil colloids cation exchange capacity CEC clay mineral structures 2:1 1:1 agriscience'
      caption = `Visual explanation of silicate clay mineral lattices, cation exchange, and colloid chemistry.`
    } else {
      querySuffix = 'soil science agricultural chemistry ICAR practical lecture demonstration'
      caption = `Authoritative soil science practical and competitive exam demonstration for ${term}.`
    }
  } else if (catLower.includes('breed') || subLower.includes('breed') || catLower.includes('livestock')) {
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
 * Fetch human-curated encyclopedic infobox image from official Wikipedia article.
 * Applies strict semantic description gatekeeper to prevent homonyms (e.g. mosques, districts, actors).
 */
export async function fetchCuratedWikipediaMedia(
  term: string,
  category?: string | null,
  subCategory?: string | null,
  chapterName?: string | null
): Promise<{
  imageUrl: string
  thumbnailUrl: string
  imageCaption: string
  sourceUrl: string
} | null> {
  const cleanTerm = cleanTermForWiki(term)
  if (!cleanTerm) return null

  const tLower = cleanTerm.toLowerCase()
  const catLower = (category || '').toLowerCase()
  const subLower = (subCategory || '').toLowerCase()

  // Generate prioritized high-probability encyclopedic article titles
  const candidates: string[] = []

  if (subLower.includes('buffalo') || tLower.includes('murrah') || tLower.includes('surti')) {
    candidates.push(`${cleanTerm} buffalo`, `${cleanTerm} breed`, cleanTerm)
  } else if (subLower.includes('cattle') || catLower.includes('cattle')) {
    candidates.push(`${cleanTerm} cattle`, `${cleanTerm} breed`, cleanTerm)
  } else if (subLower.includes('goat')) {
    candidates.push(`${cleanTerm} goat`, `${cleanTerm} breed`, cleanTerm)
  } else if (subLower.includes('sheep')) {
    candidates.push(`${cleanTerm} sheep`, `${cleanTerm} breed`, cleanTerm)
  } else if (subLower.includes('poultry') || subLower.includes('chicken')) {
    candidates.push(`${cleanTerm} chicken`, `${cleanTerm} poultry`, cleanTerm)
  } else if (tLower.includes('castrat') || tLower.includes('burdizzo')) {
    candidates.push('Burdizzo', cleanTerm)
  } else if (tLower.includes('mastitis')) {
    candidates.push('Mastitis', cleanTerm)
  } else if (tLower.includes('estrus') || tLower.includes('oestrus')) {
    candidates.push('Estrous cycle', cleanTerm)
  } else if (tLower.includes('vertisol') || tLower.includes('inceptisol') || tLower.includes('entisol') || tLower.includes('alfisol') || tLower.includes('mollisol') || tLower.includes('oxisol') || tLower.includes('ultisol') || tLower.includes('aridisol') || tLower.includes('spodosol') || tLower.includes('histol') || tLower.includes('andisol') || tLower.includes('gelisol')) {
    candidates.push(cleanTerm, `${cleanTerm} (soil)`)
  } else if (tLower.includes('kaolinite') || tLower.includes('montmorillonite') || tLower.includes('illite') || tLower.includes('vermiculite') || tLower.includes('chlorite')) {
    candidates.push(cleanTerm, `${cleanTerm} (mineral)`)
  } else if (tLower.includes('tensiometer') || tLower.includes('pycnometer') || tLower.includes('hydrometer')) {
    candidates.push(cleanTerm, `${cleanTerm} (device)`)
  } else if (tLower.includes('alluvial') || tLower.includes('black soil') || tLower.includes('red soil') || tLower.includes('laterite') || tLower.includes('peat')) {
    candidates.push(`${cleanTerm} soil`, cleanTerm)
  } else if (tLower.includes('tillage') || tLower.includes('puddling') || tLower.includes('plough') || tLower.includes('plow')) {
    candidates.push(cleanTerm, `${cleanTerm} (agriculture)`)
  } else if (catLower.includes('soil') || subLower.includes('soil')) {
    candidates.push(cleanTerm, `${cleanTerm} (soil)`, `${cleanTerm} (pedology)`)
  } else {
    candidates.push(cleanTerm)
  }

  for (const candidate of candidates) {
    const encoded = encodeURIComponent(candidate.replace(/\s+/g, '_'))
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'AgriscienceExamPrep/1.0 (educational competitive exam platform; contact: support@agriscienceprep.edu)'
        }
      })

      if (res.ok) {
        const data = await res.json()
        const desc = (data.description || '').toLowerCase()
        const titleLower = (data.title || '').toLowerCase()

        // 1. Reject if article description indicates non-agricultural homonym
        const isBadDesc = BAD_WIKI_DESCRIPTIONS.some(bad => desc.includes(bad))
        if (isBadDesc) continue

        // 2. Reject if thumbnail/title matches irrelevant blacklisted words
        const thumbSource = data.thumbnail?.source || ''
        if (isImageTitleIrrelevant(`${titleLower} ${desc} ${thumbSource}`)) {
          continue
        }

        // 3. Must have a real curated lead image
        if (data.thumbnail?.source) {
          return {
            imageUrl: data.originalimage?.source || data.thumbnail.source,
            thumbnailUrl: data.thumbnail.source,
            imageCaption: data.description ? `${data.title} (${data.description})` : data.title,
            sourceUrl: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encoded}`
          }
        }
      }
    } catch (err: any) {
      console.warn(`Wikipedia curated lookup error for "${candidate}":`, err?.message)
    }
  }

  // Clean Null: Never hallucinate random raw web search results
  return null
}

/**
 * Fetch authentic images for a concept.
 * Returns only vetted Wikipedia encyclopedic images or empty array (Clean Null).
 */
export async function fetchWikimediaGallery(
  term: string,
  category?: string | null,
  subCategory?: string | null,
  chapterName?: string | null
): Promise<Array<{ url: string; title: string; sourceUrl?: string }>> {
  const result = await fetchCuratedWikipediaMedia(term, category, subCategory, chapterName)
  if (result && result.imageUrl) {
    return [
      {
        url: result.imageUrl,
        title: result.imageCaption,
        sourceUrl: result.sourceUrl
      }
    ]
  }
  return []
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
    fetchCuratedWikipediaMedia(term, category, subCategory, chapterName),
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
 * Enrich all or un-enriched concepts in a chapter with verified Wikipedia photos and YouTube links
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
  let imagesPurged = 0

  for (const c of concepts) {
    // Preserve community uploaded images
    if (c.imageUrl && c.imageUrl.startsWith('/uploads/')) {
      continue
    }

    const isOldImageBad = c.imageUrl && isImageTitleIrrelevant(`${c.imageUrl} ${c.imageCaption || ''}`)
    const media = await enrichConceptTerm(c.term, c.category, c.subCategory, c.chapter?.name, c.examTraps)
    const updateData: any = {}

    if (isOldImageBad) {
      updateData.imageUrl = null
      updateData.thumbnailUrl = null
      updateData.imageCaption = null
      updateData.sourceUrl = null
      imagesPurged++
    }

    if (media.imageUrl) {
      updateData.imageUrl = media.imageUrl
      updateData.thumbnailUrl = media.thumbnailUrl
      updateData.imageCaption = media.imageCaption
      updateData.sourceUrl = media.sourceUrl
      imagesFound++
    } else if (isOldImageBad) {
      // Clean null
      updateData.imageUrl = null
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
    imagesPurged,
    videosGenerated
  }
}
