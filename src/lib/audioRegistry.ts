export interface AudioTrack {
  id: string
  title: string
  subtitle: string
  audioUrl: string
  chapterNamePattern: RegExp
  categoryPattern?: RegExp
  subCategoryPattern?: RegExp
  keywords: string[]
  keywordTimestamps?: Record<string, number>
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
  },
  {
    id: 'soil-weathering-processes',
    title: 'Weathering Processes',
    subtitle: 'NotebookLM Deep Dive Masterclass • 10 Physical & Chemical Weathering Keywords',
    audioUrl: '/audio/soil/weathering-processes.m4a',
    chapterNamePattern: /soil/i,
    categoryPattern: /fundamental|genesis|weathering/i,
    subCategoryPattern: /weathering/i,
    keywords: [
      'Physical Weathering',
      'Chemical Weathering',
      'Exfoliation',
      'Frost Wedging',
      'Carbonation',
      'Hydration',
      'Oxidation',
      'Reduction',
      'Solution',
      'Hydrolysis'
    ]
  },
  {
    id: 'soil-horizons-and-processes',
    title: 'Soil Horizons & Pedogenic Processes',
    subtitle: 'NotebookLM Deep Dive Masterclass • 15 Horizons & Pedogenic Processes Keywords',
    audioUrl: '/audio/soil/soil-horizons-and-processes.m4a',
    chapterNamePattern: /soil/i,
    categoryPattern: /fundamental|genesis|weathering/i,
    subCategoryPattern: /horizon|pedogenic/i,
    keywords: [
      'O Horizon',
      'A Horizon',
      'E Horizon',
      'B Horizon',
      'C Horizon',
      'R Horizon',
      'Eluviation',
      'Illuviation',
      'Humification',
      'Podzolization',
      'Laterization',
      'Calcification',
      'Gleization',
      'Pedoturbation',
      'Sodification'
    ]
  },
          {
    id: 'soil-texture-field-analysis',
    title: 'Soil Separates & Textural Triangle',
    subtitle: 'Gemini 3.8 Studio TTS • Natural Hinglish Dialogue • Interactive Timestamps • 6 mins',
    audioUrl: '/audio/soil/soil-texture-and-triangle.mp3',
    chapterNamePattern: /soil/i,
    categoryPattern: /physical|physics/i,
    subCategoryPattern: /texture|mechanical/i,
    keywords: [
      'Soil Texture',
      'Sand',
      'Silt',
      'Clay',
      'Coarse Sand',
      'Soil Textural Triangle'
    ],
    keywordTimestamps: {
          "Soil Texture": 0,
          "Sand": 82.07,
          "Coarse Sand": 150.82,
          "Silt": 200.73,
          "Clay": 268.44,
          "Soil Textural Triangle": 346.67
    },
  }
]

/**
 * Find matching audio track for current viewing context.
 * Uses a strict multi-pass matching hierarchy:
 * Pass 0: Direct Track ID Match (if concept has audioTrackId)
 * Pass 1: Exact Keyword Match across ALL tracks in the chapter
 * Pass 2: Subcategory Fallback Match
 * Pass 3: Category Fallback Match
 */
export function findMatchingAudioTrack(
  chapterName: string,
  category?: string | null,
  subCategory?: string | null,
  currentKeyword?: string | null,
  dynamicTracks?: AudioTrack[],
  audioTrackId?: string | null
): AudioTrack | null {
  const allTracks = [...(dynamicTracks || []), ...CHAPTER_AUDIO_REGISTRY]

  // Filter tracks for this chapter
  const chapterTracks = allTracks.filter(
    track => !track.chapterNamePattern || track.chapterNamePattern.test(chapterName)
  )

  // Pass 0: Direct ID match if concept has explicit audioTrackId from database
  if (audioTrackId) {
    const directMatch = chapterTracks.find(t => t.id === audioTrackId)
    if (directMatch) return directMatch
  }

  // Pass 1: Exact Keyword match across ALL tracks in the chapter
  // In multi-track subcategories (e.g. Track 1 for pioneers, Track 2 for solum/regolith),
  // this guarantees that the specific track containing this keyword is selected!
  if (currentKeyword) {
    const cleanKw = currentKeyword.trim().toLowerCase()
    const keywordMatch = chapterTracks.find(track =>
      track.keywords && track.keywords.some(k => k.trim().toLowerCase() === cleanKw)
    )
    if (keywordMatch) return keywordMatch
  }

  // Pass 2: Subcategory match (fallback ONLY if current keyword was not matched in any track)
  if (subCategory) {
    const subCatMatch = chapterTracks.find(
      track => track.subCategoryPattern && track.subCategoryPattern.test(subCategory)
    )
    if (subCatMatch) return subCatMatch
  }

  // Pass 3: Category match (broadest fallback)
  if (category) {
    const catMatch = chapterTracks.find(
      track => track.categoryPattern && track.categoryPattern.test(category) && !track.subCategoryPattern
    )
    if (catMatch) return catMatch
  }

  return null
}
