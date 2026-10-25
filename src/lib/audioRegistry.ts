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
    subtitle: 'Kokoro-82M Field Masterclass • Interactive Timestamps • 3.7 mins',
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
      "Sand": 52.57,
      "Silt": 83.27,
      "Clay": 114.05,
      "Coarse Sand": 149.56,
      "Soil Textural Triangle": 181.58
    }
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

    // 1. Specific Keyword match (highest priority for multi-cluster subcategories)
    if (currentKeyword && track.keywords.some(k => k.toLowerCase() === currentKeyword.toLowerCase())) {
      return track
    }

    // 2. Subcategory match (fallback if current keyword not specifically registered)
    if (subCategory && track.subCategoryPattern && track.subCategoryPattern.test(subCategory)) {
      return track
    }

    // 3. Category match (broadest fallback)
    if (category && track.categoryPattern && track.categoryPattern.test(category) && !track.subCategoryPattern) {
      return track
    }
  }

  return null
}
