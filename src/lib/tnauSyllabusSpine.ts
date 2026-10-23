/**
 * TNAU Agritech Portal (http://www.agritech.tnau.ac.in/) & ICAR Standard Syllabus Spine
 * Authoritative curriculum topics, taxonomies, and benchmark facts for agricultural competitive exams.
 */

export interface SyllabusSpineCategory {
  name: string
  topics: string[]
}

export interface ChapterSyllabusSpine {
  chapterKey: string
  canonicalName: string
  sourceUrl: string
  categories: SyllabusSpineCategory[]
  mustCoverTopics: string[]
  benchmarkFacts?: Record<string, string>
}

export const TNAU_SYLLABUS_SPINES: Record<string, ChapterSyllabusSpine> = {
  'animal husbandry': {
    chapterKey: 'animal-husbandry',
    canonicalName: 'Animal Husbandry & Dairy Science',
    sourceUrl: 'http://www.agritech.tnau.ac.in/animal_husbandry/anim_catt_mgt.html',
    categories: [
      {
        name: 'Breeds & Classification',
        topics: [
          'Indigenous Cattle Breeds (Milch, Draught, Dual)',
          'Exotic Cattle Breeds (Holstein Friesian, Jersey, Brown Swiss)',
          'Buffalo Breeds (Murrah, Nili-Ravi, Bhadawari, Mehsana, Jaffarabadi)',
          'Indigenous Sheep Breeds (Fine wool, Mutton, Carpet)',
          'Goat Breeds (Jamunapari, Barbari, Beetal, Black Bengal)',
          'Swine / Pig Breeds (Large White Yorkshire, Landrace, Berkshire)',
          'Poultry Breeds (Aseel, Kadaknath, White Leghorn, Rhode Island Red)'
        ]
      },
      {
        name: 'Reproductive Physiology & Lifecycle',
        topics: [
          'Oestrus Cycle Stages (Proestrus, Estrus, Metestrus, Diestrus)',
          'Gestation Period (Species-wise days & calculations)',
          'Parturition Terminology (Calving, Lambing, Kidding, Farrowing, Foaling)',
          'Dry Period & Calving Interval',
          'Artificial Insemination (Semen collection, liquid nitrogen -196°C, French mini straw)',
          'Superovulation & Embryo Transfer (MOET)',
          'Silent Heat & Anestrus'
        ]
      },
      {
        name: 'Feeds, Fodder & Nutrition',
        topics: [
          'Roughages vs Concentrates (DCP, TDN, Crude Fiber %)',
          'Leguminous vs Non-Leguminous Fodders (Berseem, Lucerne, Napier, Cowpea)',
          'Silage Making (Anaerobic fermentation, pit types, moisture 65-70%, lactic acid, pH 3.8-4.2)',
          'Hay Making (Moisture < 15%, leaf shattering, curing)',
          'Steaming Up Practice',
          'Flushing Practice in Sheep',
          'Creep Feeding & Challenge Feeding',
          'Urea Molasses Mineral Block (UMMB)'
        ]
      },
      {
        name: 'Farm Management Practices & Routine Operations',
        topics: [
          'Dehorning & Disbudding (Hot iron electric dehorner, KOH caustic stick at 1-2 weeks)',
          'Castration (Burdizzo castrator bloodless at 8-10 weeks, Elastrator)',
          'Culling, Casting & Weaning',
          'Branding, Tattooing, Ear Tagging',
          'Milking Methods (Full hand milking, stripping, knuckling disadvantages)',
          'Housing Systems (Loose housing, tie stall, head-to-head vs tail-to-tail)'
        ]
      },
      {
        name: 'Milk & Dairy Technology',
        topics: [
          'Colostrum (Feeding within 1-2 hrs, 10% body weight, IgG passive immunity, lactose deficiency)',
          'Milk Composition & Standards (Fat % & SNF for Cow, Buffalo, Toned, Double Toned, Full Cream)',
          'A1 vs A2 Beta-Casein Milk',
          'Specific Gravity & Lactometer Testing (1.028-1.032 for cow milk)',
          'Pasteurization Standards (LTLT 63°C for 30m, HTST 72°C for 15s, UHT 135-150°C)',
          'Clean Milk Production & Platform Tests (COB, Alcohol test, MBRT)'
        ]
      },
      {
        name: 'Diseases, Healthcare & Vaccination',
        topics: [
          'Foot and Mouth Disease (FMD - Aphthovirus, Picornaviridae)',
          'Anthrax (Bacillus anthracis - Sudden death, bloody discharge, blood smear test, do not open carcass)',
          'Black Quarter (BQ - Clostridium chauvoei, crepitating swelling)',
          'Brucellosis / Bang\'s Disease (Brucella abortus - 3rd trimester abortion, undulant fever in humans)',
          'Rinderpest & Haemorrhagic Septicaemia (HS - Pasteurella multocida)',
          'Mastitis & California Mastitis Test (CMT)',
          'Avian Diseases (Ranikhet / Newcastle, Gumboro / IBD, Marek\'s, Bird Flu / H5N1)',
          'Deworming Schedule'
        ]
      }
    ],
    mustCoverTopics: [
      'Gestation Period', 'Colostrum', 'Burdizzo Castrator', 'Silage Making', 'Hay Making',
      'Steaming Up', 'Flushing', 'A1 vs A2 Milk', 'Murrah Buffalo', 'Full Hand Milking',
      'HTST Pasteurization', 'California Mastitis Test (CMT)', 'Anthrax', 'Foot and Mouth Disease (FMD)',
      'Black Quarter', 'Brucellosis', 'French Mini Straw', 'Dry Period', 'Kadaknath',
      'Berseem', 'Creep Feeding', 'Dehorning', 'Specific Gravity (Lactometer)'
    ],
    benchmarkFacts: {
      'Cow Gestation': '280 - 285 days (average 282-283 days)',
      'Buffalo Gestation': '310 days',
      'Sheep Gestation': '148 - 150 days',
      'Goat Gestation': '150 - 152 days',
      'Pig Gestation': '114 days (3 months, 3 weeks, 3 days)',
      'Mare Gestation': '335 - 345 days',
      'Colostrum Feeding Time': 'Within 1 to 2 hours of birth',
      'Colostrum Dosage': '10% of calf body weight daily',
      'Silage Moisture': '65% to 70%',
      'Silage Ideal pH': '3.8 to 4.2',
      'Hay Moisture': 'Less than 15%',
      'Cow Milk Fat / SNF Standard': '3.2% - 4.0% Fat, 8.5% SNF',
      'Buffalo Milk Fat / SNF Standard': '6.0% - 7.0% Fat, 9.0% SNF',
      'Toned Milk': '3.0% Fat, 8.5% SNF',
      'Double Toned Milk': '1.5% Fat, 9.0% SNF',
      'Burdizzo Age': '8 to 10 weeks'
    }
  },


  'agronomy': {
    chapterKey: 'agronomy',
    canonicalName: 'Agronomy & Field Crops',
    sourceUrl: 'http://www.agritech.tnau.ac.in/agriculture/agri_crop_production.html',
    categories: [
      {
        name: 'Cropping Systems & Tillage',
        topics: [
          'Types of Tillage (Primary, Secondary, Zero tillage, Minimum tillage, Conservation tillage)',
          'Cropping Systems (Monoculture, Multiple cropping, Intercropping, Relay cropping, Alley cropping)',
          'Cropping Intensity & Land Equivalent Ratio (LER > 1.0)',
          'Crop Seasons in India (Kharif, Rabi, Zaid)'
        ]
      },
      {
        name: 'Cereal Crops',
        topics: [
          'Rice / Paddy (SRI method, Dapog method 11-14 days nursery, critical stages CRI, puddling)',
          'Wheat (CRI crown root initiation at 21 days after sowing, Phalaris minor weed)',
          'Maize (Queen of cereals, critical stages tasseling & silking)',
          'Millets (Pearl millet / Bajra, Sorghum / Jowar HCN / Dhurrin toxicity in young plants, Finger millet / Ragi)'
        ]
      },
      {
        name: 'Pulses & Oilseeds',
        topics: [
          'Chickpea / Gram (Nipping practice, pod borer Helicoverpa)',
          'Pigeonpea / Arhar / Red gram',
          'Soybean (Yellow jewel, 40% protein, 20% oil)',
          'Groundnut (Pegging stage, Aflatoxin contamination by Aspergillus flavus, pop pod calcium deficiency)',
          'Mustard & Rapeseed (Erucic acid, glucosinolates)'
        ]
      },
      {
        name: 'Weed Science & Herbicides',
        topics: [
          'Classification of Weeds (Narrow leaf grasses, broad leaf, sedges)',
          'Herbicide Classification (Pre-plant, Pre-emergence, Post-emergence)',
          'Striga (Parasitic on Sorghum/Maize/Sugarcane)',
          'Cuscuta (Total stem parasite on Lucerne/Niger)',
          'Orobanche (Total root parasite on Tobacco/Mustard)',
          'Loranthus (Partial stem parasite on Mango/Tea)'
        ]
      }
    ],
    mustCoverTopics: [
      'SRI Method', 'Dapog Nursery', 'CRI Stage in Wheat', 'Zero Tillage',
      'Land Equivalent Ratio (LER)', 'Nipping in Chickpea', 'Pegging in Groundnut',
      'HCN / Dhurrin Toxicity in Sorghum', 'Aflatoxin', 'Phalaris minor',
      'Striga, Cuscuta, Orobanche (Parasitic Weeds)', 'Relay Cropping'
    ]
  },
  'soil': {
    chapterKey: 'soil-science',
    canonicalName: 'Soil Science & Agricultural Chemistry',
    sourceUrl: 'Notes/Soil_Science/ (Master Revision Notes & PYQs)',
    categories: [
      {
        name: 'Fundamentals, Rocks & Minerals',
        topics: [
          'Pedology vs Edaphology',
          'Earth Crust Mineral Abundance (Feldspar 48% > Quartz 36% > Mica 10%)',
          'Igneous, Sedimentary & Metamorphic Rocks',
          'Goldich Dissolution / Weathering Resistance Series',
          'Soil Air vs Atmospheric Air (CO2 concentration)',
          'National Soil Institutes (IISS Bhopal, NBSS&LUP, CSSRI Karnal)'
        ]
      },
      {
        name: 'Soil Formation, Weathering & Pedology',
        topics: [
          'Jenny Soil Forming Factors Equation (Active vs Passive)',
          'Solum (A+E+B) vs Regolith (A+B+C)',
          'Master Horizons (O, A, E, B, C, R Layers)',
          'Eluviation (E Horizon) vs Illuviation (B Horizon)',
          'Pedogenic Processes (Podzolization, Laterization, Calcification, Gleization)',
          'Diagnostic Epipedons & Endopedons'
        ]
      },
      {
        name: 'Soil Physical Properties',
        topics: [
          'Soil Texture & Particle Size Fractions (ISSS vs USDA Systems)',
          'Stokes Law & Terminal Sedimentation Velocity',
          'Loam Textural Class Characteristics',
          'Soil Structure Types (Platy, Prismatic, Columnar, Blocky, Granular)',
          'Bulk Density (1.33 g/cm3) vs Particle Density (2.65 g/cm3)',
          'Soil Porosity & Pore Space Calculation',
          'Munsell Soil Color Chart (Hue, Value, Chroma)',
          'Soil Consistency & Atterberg Limits (Liquid, Plastic, Shrinkage)'
        ]
      },
      {
        name: 'Soil Water Dynamics & Measurement',
        topics: [
          'Physical Forms (Gravitational <1/3 bar, Capillary 1/3-31 bar, Hygroscopic 31-10000 bar)',
          'Biological Scheme (Available water 1/3-15 bar, Wilting point 15 bar)',
          'Holard, Chresard & Echard Concepts',
          'Schofield pF Curve & Tension Relationships',
          'Darcy Law of Saturated Flow & Hydraulic Conductivity',
          'Infiltration vs Percolation vs Seepage vs Leaching',
          'Moisture Measurement Instruments (Tensiometer <=0.85 bar, Neutron Probe, TDR, Gypsum Block)'
        ]
      },
      {
        name: 'Soils of India & Soil Taxonomy',
        topics: [
          'Major Indian Soils (Alluvial 43%, Red 18.5%, Black 15%, Laterite 12%)',
          'Alluvial Soil Sub-types (Khadar vs Bhangar)',
          'Black Cotton Soil / Vertisols (Self-ploughing, Montmorillonite, Titaniferous magnetite)',
          'Red Soils & Acidic Laterite Soils (Buchanan 1807)',
          'USDA Comprehensive Soil Taxonomy (12 Orders)',
          'India Order Distribution (Inceptisols 39.74% > Entisols > Alfisols > Vertisols)'
        ]
      },
      {
        name: 'Soil Chemistry, Colloids & Organic Matter',
        topics: [
          'Inorganic vs Organic Soil Colloids (<1 micron)',
          'Layer Silicate Clays (1:1 Kaolinite vs 2:1 Montmorillonite vs 2:1 Illite vs 2:1:1 Chlorite)',
          'Isomorphous Substitution & Permanent Negative Charge',
          'Cation Exchange Capacity (CEC order: Humus > Vermiculite > Montmorillonite > Illite > Kaolinite)',
          'Anion Exchange Capacity (AEC) & Base Saturation Percentage',
          'Soil Organic Matter & Humus Fractions (Fulvic acid, Humic acid, Humin)',
          'Soil C:N Ratio Benchmarks (10:1 to 12:1 in tropical soils)',
          'Van Bemmelen Factor (OM = OC x 1.724)'
        ]
      },
      {
        name: 'Problematic Soils & Chemical Reclamation',
        topics: [
          'Saline Soils (White Alkali, Solan chalk: EC > 4 dS/m, ESP < 15%, pH < 8.5)',
          'Sodic / Alkali Soils (Black Alkali, Solonetz: EC < 4 dS/m, ESP > 15%, pH 8.5-10.0)',
          'Saline-Sodic Soils (EC > 4 dS/m, ESP > 15%, pH variable)',
          'Sodium Adsorption Ratio (SAR) & Exchangeable Sodium Percentage (ESP)',
          'Acid Soils & Acid Sulfate Soils (Cat-Clay, pH < 4.0)',
          'Chemical Amendments: Gypsum Requirement for Sodic soils & Lime Requirement for Acid soils',
          'Leaching Requirement & Drainage Management'
        ]
      },
      {
        name: 'Soil Erosion, USLE & Watershed Management',
        topics: [
          'Permissible Soil Loss Limit (12 t/ha/yr in India)',
          'Water Erosion Mechanics & Stages (Splash -> Sheet -> Rill -> Gully -> Ravine)',
          'Rill vs Gully Tillage Obliteration Distinction',
          'Gully Classes (G1, G2, G3, G4)',
          'Universal Soil Loss Equation (USLE: A = R x K x L x S x C x P)',
          'Wind Erosion Mechanics (Saltation 50-75%, Surface Creep 5-25%, Suspension 3-4%)',
          'Mechanical Soil Conservation (Contour bunding, Graded bunding, Bench terracing)',
          'Watershed Hierarchy (Macro > 50000 ha, Sub, Milli, Micro, Mini)'
        ]
      },
      {
        name: 'Plant Nutrients, Fertilizers & Biofertilizers',
        topics: [
          '17 Essential Elements (Arnon & Stout Criteria of Essentiality 1939)',
          'Nutrient Mobility in Plants vs Soils',
          'Deficiency Symptoms (Khaira disease in rice, Whiptail in cauliflower, Marsh spot in peas)',
          'Liebig Law of Minimum & Cate-Nelson Critical Levels',
          'Bulky Organic Manures (FYM, Vermicompost, Compost: Bangalore vs Indore)',
          'Fertilizer Control Order (FCO 1985) & Fertilizer Grades',
          'Nitrogen Fertilizers (Urea, CAN / Kisan Khad, Ammonium Sulphate)',
          'Phosphatic Fertilizers (SSP, DAP, Rock Phosphate for acidic soils)',
          'Potassic Fertilizers (MOP, SOP)',
          'Nitrogen Losses (Volatilization, Denitrification, Leaching)',
          'Biofertilizers (Rhizobium, Azotobacter, Azospirillum, PSB, VAM, BGA, Azolla)'
        ]
      },
      {
        name: 'Tillage Systems & Soil Management',
        topics: [
          'Father of Tillage (Jethro Tull)',
          'Tilth Characteristics & Optimum Moisture (60% Field Capacity)',
          'Primary Tillage Implements (Mouldboard Plough, Disc Plough)',
          'Secondary Tillage Implements (Harrows, Cultivators, Planking)',
          'Puddling Dynamics in Wetland Rice (Bulk density increase, percolation reduction)',
          'Conservation Tillage (Zero Tillage, Minimum Tillage, Stubble Mulching >30% residue)'
        ]
      }
    ],
    mustCoverTopics: [
      'Stokes Law', 'Soil Texture ISSS vs USDA', 'Bulk Density vs Particle Density',
      'Gravitational vs Capillary vs Hygroscopic Water', 'Field Capacity and Wilting Point',
      'Schofield pF Curve', 'Tensiometer', 'Solum vs Regolith', 'Master Horizons O A E B C',
      'Alluvial Soils Khadar vs Bhangar', 'Vertisols / Black Cotton Soil', 'Inceptisols',
      '1:1 vs 2:1 Clay Minerals', 'Montmorillonite vs Kaolinite', 'Cation Exchange Capacity (CEC)',
      'Van Bemmelen Factor (1.724)', 'Saline Soils vs Sodic Soils (EC, ESP, pH)',
      'Gypsum Requirement', 'Acid Sulfate Soils / Cat-Clay', 'Water Erosion Stages Splash Sheet Rill Gully',
      'Universal Soil Loss Equation (USLE)', '17 Essential Nutrients (Arnon Criteria)',
      'Khaira Disease of Rice', 'Whiptail in Cauliflower', 'Urea & CAN (Kisan Khad)',
      'Single Super Phosphate (SSP) & DAP', 'Rhizobium & Azospirillum', 'Jethro Tull',
      'Puddling in Rice', 'Zero Tillage'
    ]
  }
}

/**
 * Helper to get the canonical TNAU syllabus spine for any chapter name.
 */
export function getTNAUSpine(chapterName: string): ChapterSyllabusSpine | null {
  const norm = chapterName.toLowerCase().trim()
  for (const [key, spine] of Object.entries(TNAU_SYLLABUS_SPINES)) {
    if (norm.includes(key) || key.includes(norm)) {
      return spine
    }
  }
  return null
}
