export interface AudioTrack {
  id: string
  title: string
  subtitle: string
  audioUrl: string
  chapterNamePattern: RegExp
  categoryPattern?: RegExp
  subCategoryPattern?: RegExp
  keywords: string[]
}

export const CHAPTER_AUDIO_REGISTRY: AudioTrack[] = [
  {
    id: 'soil-pedological-foundations',
    title: 'Pedological Concepts & Foundations',
    subtitle: 'NotebookLM Deep Dive Masterclass • 11 Foundational Keywords',
    audioUrl: '/audio/soil/pedological-foundations.m4a',
    chapterNamePattern: /soil/i,
    categoryPattern: /fundamental|genesis|weathering/i,
    subCategoryPattern: /pedological|foundation/i,
    keywords: [
      'Pedology',
      'Edaphology',
      'V. V. Dokuchaev',
      'Hans Jenny',
      'Solum',
      'Regolith',
      'Pedon',
      'Polypedon',
      'Soil Profile',
      'Saprolite',
      'Soil Catena'
    ]
  },
  {
    id: 'soil-rocks-and-minerals',
    title: 'Rocks & Primary/Secondary Minerals',
    subtitle: 'NotebookLM Deep Dive Masterclass • 13 Petrology & Mineralogy Keywords',
    audioUrl: '/audio/soil/rocks-and-minerals.m4a',
    chapterNamePattern: /soil/i,
    categoryPattern: /fundamental|genesis|weathering/i,
    subCategoryPattern: /rock|mineral/i,
    keywords: [
      'Igneous Rocks',
      'Sedimentary Rocks',
      'Metamorphic Rocks',
      'Basalt',
      'Granite',
      'Quartz',
      'Feldspar',
      'Mica',
      'Olivine',
      'Amphiboles',
      'Calcite',
      'Primary Minerals',
      'Secondary Minerals'
    ]
  }
]

/**
 * Find matching audio track for current viewing context
 */
export function findMatchingAudioTrack(
  chapterName: string,
  category?: string | null,
  subCategory?: string | null,
  currentKeyword?: string | null
): AudioTrack | null {
  for (const track of CHAPTER_AUDIO_REGISTRY) {
    if (!track.chapterNamePattern.test(chapterName)) continue

    // 1. Direct subcategory match
    if (subCategory && track.subCategoryPattern && track.subCategoryPattern.test(subCategory)) {
      return track
    }

    // 2. Keyword match
    if (currentKeyword && track.keywords.some(k => k.toLowerCase() === currentKeyword.toLowerCase())) {
      return track
    }

    // 3. Category match (if no subcategory constraint)
    if (category && track.categoryPattern && track.categoryPattern.test(category) && !track.subCategoryPattern) {
      return track
    }
  }

  return null
}
