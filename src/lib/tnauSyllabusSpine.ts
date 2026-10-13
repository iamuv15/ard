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

  'soil': {
    chapterKey: 'soil',
    canonicalName: 'Soil Science & Agricultural Chemistry',
    sourceUrl: 'http://www.agritech.tnau.ac.in/agriculture/agri_soil_index.html',
    categories: [
      {
        name: 'Soil Physical Properties',
        topics: [
          'Soil Texture & Stokes Law (Sand, Silt, Clay particles)',
          'Soil Structure (Platy, Prismatic, Columnar, Blocky, Granular)',
          'Bulk Density vs Particle Density (Typical BD 1.33 g/cm³, PD 2.65 g/cm³)',
          'Soil Porosity & Water Retention (Field Capacity, Permanent Wilting Point, Hygroscopic Coefficient)',
          'Soil Color & Munsell Color Chart'
        ]
      },
      {
        name: 'Soil Chemical & Biological Properties',
        topics: [
          'Cation Exchange Capacity (CEC - Montmorillonite > Illite > Kaolinite)',
          'Soil pH & Buffering Capacity',
          'Soil Organic Matter & Humus (C:N Ratio of normal arable soil 10:1 to 12:1)',
          'Electrical Conductivity (EC for salinity)',
          'Clay Mineralogy (1:1 non-expanding Kaolinite, 2:1 expanding Montmorillonite, 2:1 non-expanding Illite)'
        ]
      },
      {
        name: 'Indian Soil Orders & Classification',
        topics: [
          'Alluvial Soils (Entisols / Inceptisols - Largest area in India)',
          'Black Soils / Regur (Vertisols - Montmorillonite, self-ploughing, cracks, Maharashtra/MP/Gujarat)',
          'Red Soils (Alfisols - Kaolinite dominant, iron oxides hematite/goethite)',
          'Laterite Soils (Ultisols / Oxisols - High leaching of silica, rich in iron/aluminum sesquioxides)',
          'Saline, Sodic & Alkali Soils',
          'Desert / Arid Soils & Peaty Soils'
        ]
      },
      {
        name: 'Problem Soils & Reclamation',
        topics: [
          'Saline Soils (White Alkali - EC > 4 dS/m, ESP < 15%, pH < 8.5, Leaching reclamation)',
          'Sodic / Alkali Soils (Black Alkali - EC < 4 dS/m, ESP > 15%, pH > 8.5, Gypsum CaSO4.2H2O reclamation)',
          'Saline-Sodic Soils',
          'Acid Soils (pH < 5.5, Lime CaCO3 reclamation, Al & Fe toxicity, Mo deficiency)'
        ]
      }
    ],
    mustCoverTopics: [
      'Black Soil (Vertisols)', 'Alluvial Soil', 'Bulk Density', 'Particle Density',
      'Montmorillonite', 'Kaolinite', 'C:N Ratio', 'Gypsum Reclamation', 'Acid Soil Liming',
      'Field Capacity', 'Permanent Wilting Point', 'Cation Exchange Capacity (CEC)', 'Stokes Law',
      'Electrical Conductivity (EC)', 'Exchangeable Sodium Percentage (ESP)'
    ],
    benchmarkFacts: {
      'Average Particle Density': '2.65 g/cm³',
      'Average Bulk Density': '1.33 g/cm³',
      'Normal Soil C:N Ratio': '10:1 to 12:1',
      'Saline Soil Threshold': 'EC > 4 dS/m, ESP < 15%, pH < 8.5',
      'Sodic Soil Threshold': 'EC < 4 dS/m, ESP > 15%, pH > 8.5',
      'Gypsum for Sodic Soil': 'Replaces exchangeable Na+ with Ca2+'
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
