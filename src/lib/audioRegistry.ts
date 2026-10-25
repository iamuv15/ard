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
    id: 'soil-texture-and-mechanical-analysis',
    title: 'Soil Texture & Mechanical Analysis',
    subtitle: 'NotebookLM Deep Dive Masterclass • 10 Texture & Sedimentation Keywords',
    audioUrl: '/audio/soil/soil-texture-and-mechanical-analysis.m4a',
    chapterNamePattern: /soil/i,
    categoryPattern: /physical|physics/i,
    subCategoryPattern: /texture|mechanical/i,
    keywords: [
      'Soil Texture',
      'Sand',
      'Silt',
      'Clay',
      'Coarse Sand',
      'Soil Textural Triangle',
      'Mechanical Analysis',
      "Stokes' Law",
      'Bouyoucos Hydrometer Method',
      'Sedimentation Velocity'
    ]
  },
  {
    id: 'soil-structure-and-aggregation',
    title: 'Soil Structure & Aggregation',
    subtitle: 'NotebookLM Deep Dive Masterclass • 12 Structural Types & Aggregation Keywords',
    audioUrl: '/audio/soil/soil-structure-and-aggregation.m4a',
    chapterNamePattern: /soil/i,
    categoryPattern: /physical|physics/i,
    subCategoryPattern: /structure|aggregation/i,
    keywords: [
      'Soil Structure',
      'Peds',
      'Aggregates',
      'Granular Structure',
      'Crumb Structure',
      'Platy Structure',
      'Blocky Structure',
      'Prismatic Structure',
      'Columnar Structure',
      'Single-Grained Condition',
      'Massive Condition',
      'Soil Aggregation'
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
