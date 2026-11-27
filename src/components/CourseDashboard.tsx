'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  CheckCircle2, 
  Menu, 
  X, 
  Bookmark, 
  BookOpen, 
  Play, 
  Zap, 
  FileText,
  Sparkles,
  Award,
  Layers,
  Shuffle,
  Flame
} from 'lucide-react'
import LogOutButton from '@/components/LogOutButton'

type Quiz = {
  id: number
  name: string
  _count: { questions: number }
  topic?: string | null
  difficulty?: string | null
}

type Chapter = {
  id: number
  name: string
  quizzes: Quiz[]
  _count?: { concepts?: number }
}

type CourseDashboardProps = {
  chapters: Chapter[]
  mistakeCount: number
  bookmarkCount?: number
  chapterMistakesCount?: Record<number, number>
  userName: string | null
}

function getChapterIcon(name: string) {
  const lower = name.toLowerCase()
  if (lower.includes('soil')) return '🌱'
  if (lower.includes('animal') || lower.includes('husbandry') || lower.includes('poultry')) return '🐄'
  if (lower.includes('horticulture') || lower.includes('fruit')) return '🍎'
  if (lower.includes('agronomy') || lower.includes('crop')) return '🌾'
  if (lower.includes('irrigation') || lower.includes('water')) return '💧'
  if (lower.includes('engineering') || lower.includes('machinery')) return '🚜'
  if (lower.includes('nutrition') || lower.includes('fertilizer')) return '🧪'
  if (lower.includes('seed')) return '🥜'
  if (lower.includes('extension')) return '📢'
  if (lower.includes('forestry')) return '🌲'
  if (lower.includes('basic')) return '📚'
  return '📝'
}

const TOPIC_METADATA: Record<string, { desc: string; easyDesc: string; medDesc: string; hardDesc: string }> = {
  "Soil Genesis, Rocks & Weathering": {
    desc: "Pedology foundations, rock taxonomy, weathering processes, Dokuchaev soil horizons & catena dynamics.",
    easyDesc: "Definitional recall, founders & basic rock/mineral identification",
    medDesc: "Mineral hardness, weathering rates, standard constants & mineral facts",
    hardDesc: "Bowen's reaction series, obscure mineralogy & multi-statement synthesis"
  },
  "Soil Physical Properties & Texture": {
    desc: "Soil texture, mechanical analysis, textural triangle, bulk & particle density, porosity & soil structure.",
    easyDesc: "Definitions of texture, structure, aeration & density",
    medDesc: "USDA textural separates & standard bulk density values",
    hardDesc: "Stokes' law formulas, porosity calculations & soil physics traps"
  },
  "Soil Water Dynamics & Hydrology": {
    desc: "Soil water potentials, pF curve, movement, measurement tools & moisture constants.",
    easyDesc: "Gravitational, capillary & hygroscopic water definitions",
    medDesc: "pF values, tensiometer ranges & field capacity constants",
    hardDesc: "Moisture content math, Darcy's law equations & hydrology traps"
  },
  "Soil Chemistry, Colloids & Organic Matter": {
    desc: "Clay minerals, ion exchange, CEC, AEC, soil humus & C:N ratio dynamics.",
    easyDesc: "Soil colloids & organic matter definitions",
    medDesc: "CEC values of clay minerals (1:1 vs 2:1 lattice) & standard ratios",
    hardDesc: "Base saturation calculations & complex anion exchange traps"
  },
  "Problematic Soils & Reclamation": {
    desc: "Saline, sodic/alkali, acid soils & chemical amendments like gypsum and lime.",
    easyDesc: "Definitions of saline, sodic & acid soils",
    medDesc: "Benchmark EC, ESP, and pH thresholds for reclamation",
    hardDesc: "Gypsum requirement calculation formulas & acid-sulfate traps"
  },
  "Soil Erosion, Conservation & Watershed": {
    desc: "Water and wind erosion stages, USLE equation & conservation agronomy.",
    easyDesc: "Water erosion stages (splash, sheet, rill, gully)",
    medDesc: "Contour bunding slopes & gully classification limits",
    hardDesc: "Universal Soil Loss Equation (USLE) math & erosion indices"
  },
  "Plant Nutrients, Fertilizers & Manures": {
    desc: "Essential nutrients, deficiency symptoms, chemical fertilizers & organic manures.",
    easyDesc: "Macronutrient vs micronutrient basic classifications",
    medDesc: "Nutrient percentages in Urea, DAP, MOP & organic manures",
    hardDesc: "Fertilizer dose calculation formulas & hidden hunger traps"
  },
  // ─── Animal Husbandry ───
  "Animal Terminology & Livestock Breeds": {
    desc: "Zootechnical terminology, indigenous & exotic breeds of cattle, buffalo, sheep & goat, native tracts & physical characteristics.",
    easyDesc: "Core terms (heifer, ewe, doe, ram, steer) & basic breed identification",
    medDesc: "Origin states, lactation yields, fat percentages & horn/ear shapes",
    hardDesc: "Exotic breed inheritance, dual-purpose comparisons & tricky classification traps"
  },
  "Anatomy, Digestive Physiology & Dentition": {
    desc: "Ruminant four-compartment stomach (rumen, reticulum, omasum, abomasum), dental formulas, aging by teeth & vital physiological constants.",
    easyDesc: "Compartment names, true stomach & basic digestive definitions",
    medDesc: "Dental formulas of cattle/goat, normal temperature, pulse & respiration constants",
    hardDesc: "Eructation/rumination mechanisms, age deduction by incisors & physiological traps"
  },
  "Feeds, Fodder & Animal Nutrition": {
    desc: "Roughages vs concentrates, silage fermentation, hay curing, TDN, CP, DCP & anti-nutritional factors (HCN, gossypol).",
    easyDesc: "Definitions of roughage, concentrate, silage & hay crops",
    medDesc: "Silage moisture/pH limits, TDN/DCP values in cakes & anti-nutritional toxins",
    hardDesc: "Pearson square feed mixing calculations & nutritional deficiency traps"
  },
  "Animal Genetics, Breeding & Reproduction": {
    desc: "Systems of breeding (inbreeding, crossbreeding, grading up), estrous cycle, AI technique, semen evaluation & cryopreservation.",
    easyDesc: "Gestation periods, estrous cycle length & basic breeding terms",
    medDesc: "AI straw specs, liquid nitrogen temperature (-196°C) & estrus signs",
    hardDesc: "Grading up inheritance fractions & reproductive hormone feedback traps"
  },
  "Dairy Science, Milk Processing & Housing": {
    desc: "Clean milk production, housing types (stanchion, loose), milk composition (fat, SNF, casein), pasteurization (LTLT, HTST, UHT) & dairy products.",
    easyDesc: "Basic milk composition, colostrum facts & housing terms",
    medDesc: "FSSAI legal standards (cow vs buffalo fat/SNF) & pasteurization time/temp constants",
    hardDesc: "Pearson square milk standardization math, Gerber test calculations & dairy chemistry"
  },
  "Animal Diseases, Vaccination & Healthcare": {
    desc: "Bacterial (Anthrax, BQ, HS, Mastitis), viral (FMD, Rinderpest, Rabies), metabolic (Milk fever, Bloat) diseases & vaccination schedules.",
    easyDesc: "Disease symptoms, causal pathogen types & common names",
    medDesc: "Causative organisms (Clostridium, Pasteurella, Bacillus) & diagnostic tests",
    hardDesc: "Zoonotic transmission dynamics, post-mortem findings & complex pathology traps"
  },
  "Poultry Science & Swine Management": {
    desc: "Poultry breeds (egg vs broiler, Aseel, Kadaknath), incubation & candling, poultry diseases (Ranikhet, Marek's) & pig/swine rearing.",
    easyDesc: "Incubation periods (21 days), basic poultry breeds & swine terms",
    medDesc: "Incubation temp/humidity constants, brooding floor space & disease symptoms",
    hardDesc: "Broiler Feed Conversion Ratio (FCR) calculations & hatchery management traps"
  },
  // ─── Horticulture ───
  "Horticulture Fundamentals & Orchard Establishment": {
    desc: "Branches of horticulture (pomology, olericulture, floriculture), planting design systems (square, quincunx, hexagonal, contour), windbreaks & HDP.",
    easyDesc: "Horticulture branches, layout system names & basic definitions",
    medDesc: "Plant density calculation comparisons (hexagonal has 15% more plants) & layout geometry",
    hardDesc: "High Density Planting (HDP) population formulas & orchard engineering traps"
  },
  "Plant Propagation, Rootstocks & Nursery Management": {
    desc: "Sexual vs asexual propagation, grafting, budding, layering, cutting, rootstocks & specialized vegetative structures (suckers, slips, runners).",
    easyDesc: "Basic propagation terms, organ names (banana suckers, pineapple slips) & seed types",
    medDesc: "Specific budding/grafting methods for major crops (T-budding in citrus, veneer in mango)",
    hardDesc: "Polyembryony genetics, rootstock-scion incompatibility mechanisms & tissue culture stages"
  },
  "Canopy Management, Pruning, Bahar Treatment & PGRs": {
    desc: "Training & pruning systems (heading back, thinning out, girdling), Bahar treatment (Ambe, Mrig, Hasta) & plant growth regulators (NAA, GA3, Ethrel, Paclobutrazol).",
    easyDesc: "Pruning vs training definitions & basic Bahar names",
    medDesc: "Bahar treatment months (flowering vs harvesting) & recommended PGR concentrations (ppm)",
    hardDesc: "Paclobutrazol biochemical action, C:N ratio shifts & off-season flowering triggers"
  },
  "Tropical & Subtropical Pomology (Mango, Banana, Citrus, Papaya)": {
    desc: "Major tropical fruits: Mango, Banana, Citrus & Papaya - varieties, parentage, physiological disorders (spongy tissue, malformation) & management.",
    easyDesc: "Famous varieties, botanical names & obvious disorder symptoms",
    medDesc: "Hybrid parent crosses (Neelum x Dashehari = Amrapali), Sigatoka/Bunchy top & spacing",
    hardDesc: "Spongy tissue calcium transport biochemistry, malformation etiology & pedigree traps"
  },
  "Arid, Temperate Fruits & Plantation Crops": {
    desc: "Guava, Grape, Pineapple, Pomegranate, Ber, Aonla, Apple, Coconut, Cashew, Tea, Coffee & Rubber - commercial management & varieties.",
    easyDesc: "Fruit types, states of origin & common harvest practices",
    medDesc: "Grape training systems (Bower, Kniffin), Apple chilling hours & Cashew/Coconut botany",
    hardDesc: "Temperate rest-breaking chemistry, plantation tapping physiology & multi-crop traps"
  },
  "Olericulture (Vegetable Crops) & Floriculture": {
    desc: "Solanaceous, cole, cucurbit, root & bulb vegetables; commercial flowers (rose, marigold, jasmine, gladiolus), lawns & landscaping.",
    easyDesc: "Edible parts, vegetable families & popular flower types",
    medDesc: "Maturity indices, seed rates, isolation distances & flower pulsing/preservatives",
    hardDesc: "Sex expression genetics in cucurbits, photoperiodic floral induction & bonsai techniques"
  },
  "Post-Harvest Technology, Maturity Indices & Preservation": {
    desc: "Harvest maturity indicators, TSS, Brix, climacteric vs non-climacteric ripening, cold storage, fruit preservation (jam, jelly, squash) & FSSAI specs.",
    easyDesc: "Definitions of climacteric fruits, jam vs jelly & shelf-life basics",
    medDesc: "Minimum TSS/Brix values, pectin requirements, acidity percentages & storage temperatures",
    hardDesc: "Thermal death time kinetics in canning, syneresis chemistry & preservation calculations"
  },
  // ─── Basics of Agriculture ───
  "Introduction to Agriculture, Agronomy & Factors Affecting Crop Production": {
    desc: "Foundations of agriculture, history, branches, institutes (IIVR etc.), seasons (Kharif, Rabi, Zaid), weather & climate (cardinal temperatures, IMD definitions, weather warnings), climatic, edaphic, physiographic & biotic factors.",
    easyDesc: "Agricultural branches, crop seasons, basic institute locations & weather terms",
    medDesc: "Cardinal temperature ranges, IMD rainfall definitions & specific environmental thresholds",
    hardDesc: "Photoperiodic response mechanisms, heat unit calculations & microclimate dynamics"
  },
  "Agro-Climatic & Agro-Ecological Zones of India": {
    desc: "Planning Commission 15 Agro-climatic zones, Western/Eastern Himalayas, Gangetic Plains, Plateau & Hills, coastal regions, NARP 127 zones, dominant cropping systems, soils & rainfall patterns.",
    easyDesc: "Zone names, total number of zones (15 ACZs / 127 NARP) & major regional crops",
    medDesc: "Specific state-to-zone allocations, soil characteristics & annual rainfall parameters",
    hardDesc: "Agro-ecological sub-region distinctions, resource constraints & comparative zone analysis"
  },
  "Soil Erosion, Conservation & Land Capability Classification": {
    desc: "Mechanisms of soil erosion, water erosion stages (splash, sheet, rill, gully, ravine), wind erosion (saltation, suspension, creep), conservation engineering (bunding, terracing) & USDA Land Capability Classes (I to VIII).",
    easyDesc: "Erosion stage definitions, water vs wind erosion types & common conservation terms",
    medDesc: "Slope percentages for contour/graded bunding vs bench terracing & LCC class limits",
    hardDesc: "Universal Soil Loss Equation (USLE) factor mechanics & advanced ravine reclamation"
  },
  "Cropping Systems, Patterns & Farming Systems": {
    desc: "Monoculture, multiple cropping, intercropping (additive, replacement, strip, relay, alley, multi-storeyed), crop rotation, Cropping Intensity (CI), Land Equivalent Ratio (LER) & Integrated Farming Systems (IFS).",
    easyDesc: "Definitions of intercropping, mixed cropping, crop rotation & farming systems",
    medDesc: "Specific crop compatibility pairs, spatial arrangements & standard rotation rules",
    hardDesc: "Cropping Intensity & LER numerical calculations, Land Equivalent Ratio interpretations"
  },
  "Dryland Agriculture, Rainfed Farming & Drought Management": {
    desc: "Classification by rainfall (Dry farming <750mm, Dryland 750-1150mm, Rainfed >1150mm), drought types (meteorological, hydrological, agricultural), dry spells, anti-transpirants (PMA, Kaolin, Cycocel) & watershed management.",
    easyDesc: "Dryland vs rainfed definitions, drought types & basic anti-transpirant categories",
    medDesc: "Rainfall boundary figures (750mm, 1150mm), dry spell day limits & chemical anti-transpirants",
    hardDesc: "Moisture stress physiological adaptations, water budgeting & watershed hydrology"
  },
  "Sustainable Agriculture & Organic Farming Systems": {
    desc: "Sustainable agriculture principles, LEISA, Zero Budget Natural Farming (ZBNF - Bijamrit, Jiwamrit, Mulching, Waaphasa), green manuring, biofertilizers, vermiculture, NPOP, APEDA & PGS-India certification.",
    easyDesc: "Organic farming definitions, ZBNF pillars & biofertilizer organism names",
    medDesc: "APEDA/NPOP certification standards, PGS-India operational rules & C:N ratio shifts",
    hardDesc: "Regulatory compliance under NPOP vs PGS, organic soil chemistry & bio-inoculant biochemistry"
  },
  "Precision Agriculture, Hi-Tech Farming & Modern Innovations": {
    desc: "Precision farming tools, GPS, GIS, remote sensing, Variable Rate Technology (VRT), soil sensors, agricultural drones, IoT, protected cultivation (polyhouses/greenhouses) & soilless culture (hydroponics, aeroponics).",
    easyDesc: "Basic precision farming definitions, drone uses & hydroponics/aeroponics terms",
    medDesc: "Sensor types (optical, dielectric soil moisture), VRT components & protected cultivation specs",
    hardDesc: "Spatial variability geostatistics, multispectral/NDVI indices & sensor calibration engineering"
  },
  // ─── Irrigation ───
  "Water Resources, Soil-Water Movement & Plant Absorption": {
    desc: "Global water distribution, saturated vs unsaturated flow, gravitational and capillary movement, Darcy's law, vapour transfer, active vs passive absorption & transpiration pull.",
    easyDesc: "Water resources distribution, saturated vs unsaturated flow definitions & absorption types",
    medDesc: "Darcy's law parameters, capillary movement constants & water potential components",
    hardDesc: "Soil moisture tension curves, matric flux potential & thermodynamic water relations"
  },
  "Crop Water Requirement, Evapotranspiration & Consumptive Use": {
    desc: "Evapotranspiration (ET), reference crop ET, potential ET (PET), lysimeters, open pan evaporimeter, crop coefficient (Kc), effective rainfall & crop water requirements (rice, sugarcane, wheat).",
    easyDesc: "ET definitions, pan evaporimeter basics & relative water requirement rankings",
    medDesc: "Crop water requirement ranges (rice 1200mm, sugarcane 1500-2500mm) & Kc stages",
    hardDesc: "Penman-Monteith equation factors, Blaney-Criddle formula & consumptive use math"
  },
  "Irrigation Scheduling & Critical Growth Stages of Crops": {
    desc: "Critical stages for irrigation (CRI in wheat, tasseling/silking in maize, tillering in rice, rosette in mustard), IW/CPE ratio, soil moisture depletion percentage, tensiometers & infrared thermometry.",
    easyDesc: "Crown root initiation (CRI), critical stages of major crops & tensiometer uses",
    medDesc: "IW/CPE ratio values for different crops & soil moisture tension bar limits (-0.8 bar)",
    hardDesc: "Stress-degree-day (SDD) calculations, CWSI indices & deficit irrigation strategies"
  },
  "Surface Irrigation Methods & Field Layouts": {
    desc: "Surface irrigation methods: check basin, ring basin (orchards), border strip, furrow (corrugation, alternate furrow, broad bed furrow), wild flooding, surge irrigation & hydraulics.",
    easyDesc: "Definitions of border, furrow, ring basin and check basin methods",
    medDesc: "Stream size, slope limits for border strips & furrow length/spacing standards",
    hardDesc: "Advance and recession curve hydraulics, cutback irrigation & intake rate equations"
  },
  "Micro-Irrigation Systems (Drip & Sprinkler) & Fertigation": {
    desc: "Drip/trickle irrigation components (emitters, laterals, sand filters, venturi), operating pressures (1-1.5 kg/cm²), sprinkler types (center pivot, raingun, 2.5-4 kg/cm²), microjets & fertigation.",
    easyDesc: "Drip vs sprinkler definitions, water saving percentages & emitter types",
    medDesc: "Operating pressures, discharge rates (Lph), uniformity coefficient & filtration types",
    hardDesc: "Emitter clogging chemical chemistry, lateral friction loss formulas & fertigation solubility"
  },
  "Irrigation Efficiencies, Water Quality & Agricultural Drainage": {
    desc: "Conveyance, application, storage & water use efficiencies (WUE); irrigation water quality standards (SAR, RSC, Boron, EC) & agricultural drainage (surface vs subsurface tile drainage).",
    easyDesc: "Water use efficiency definitions, salinity/sodicity basic terms & drainage benefits",
    medDesc: "SAR formula components, RSC threshold limits (meq/L) & standard efficiency ranges",
    hardDesc: "SAR and ESP equilibrium chemistry, Hooghoudt's drainage spacing equation & salt balance"
  },
  "Irrigation Projects Classification, PMKSY & Water Policy": {
    desc: "Classification of irrigation projects by CCA (Major >10,000 ha, Medium 2,000-10,000 ha, Minor <2,000 ha), PMKSY (Per Drop More Crop, Har Khet Ko Pani, AIBP), CADP & water governance.",
    easyDesc: "CCA limits for Major, Medium, Minor projects & PMKSY full forms/components",
    medDesc: "Component ministry mappings, Command Area Development Programme (CADP) years & targets",
    hardDesc: "Water duty-delta-base period numerical problems & irrigation policy evaluation"
  },
  // ─── Agroforestry ───
  "Agroforestry Fundamentals, Scope & Classification": {
    desc: "Agroforestry concepts, history, ICRAF, classification systems (P.K. Nair structural, functional, ecological, socioeconomic), spatial/temporal arrangements & environmental benefits.",
    easyDesc: "Agroforestry definitions, ICRAF location & basic classification criteria",
    medDesc: "Structural vs functional system types & ecological interaction categories",
    hardDesc: "Microclimate modification energetics & multi-tier system light interception physics"
  },
  "Agroforestry Systems: Agrisilviculture, Silvopasture & Agrosilvopasture": {
    desc: "Agrisilvicultural practices (alley cropping, hedgerow intercropping), Silvopasture (trees + grasses/grazing), Horti-pasture, Agrosilvopastoral combinations & protein banks.",
    easyDesc: "Definitions of agrisilviculture, silvopasture, alley cropping & homegardens",
    medDesc: "Alley spacing widths, compatible grass-tree combinations & lopping cycles",
    hardDesc: "Root architecture stratification, resource complementarity & nutrient pump dynamics"
  },
  "Specialized Agroforestry Systems (Taungya, Shifting Cultivation & Aquaforestry)": {
    desc: "Taungya system origins and plantation forestry methods, shifting/Jhum cultivation alternatives, aquaforestry/mangrove silvofisheries, apiculture & sericulture.",
    easyDesc: "Taungya definitions, Jhum/shifting cultivation states & apiculture terms",
    medDesc: "Taungya crop withdrawal periods, mangrove species in aquaculture & honey-yielding tree species",
    hardDesc: "Socio-tenurial dynamics of Taungya, nutrient cycling in slash-and-burn recovery phases"
  },
  "Multipurpose Tree Species (MPTS) & Nitrogen-Fixing Trees": {
    desc: "Characteristics of ideal MPTS, nitrogen-fixing trees: Subabul (Leucaena), Khejri (Prosopis cineraria), Babul (Acacia nilotica), Shisham (Dalbergia), Casuarina & Neem.",
    easyDesc: "Common names, state tree matches (Khejri in Rajasthan) & basic nitrogen fixing trees",
    medDesc: "Botanical names, mimosine toxicity in Subabul & specific ecological niches",
    hardDesc: "Frankia actinorhizal symbioses, nodulation genetics & allelopathic exudate chemistry"
  },
  "Commercial & Fast-Growing Trees (Bamboo, Poplar & Eucalyptus)": {
    desc: "Poplar (Populus deltoides), Eucalyptus tereticornis, Bamboo botany, culm management, National Bamboo Mission, Melia dubia, Teak, Sandalwood & rotation cycles.",
    easyDesc: "Fast growing tree names, Bamboo grass taxonomy & commercial uses",
    medDesc: "Poplar & Eucalyptus rotation ages (6-8 yrs), planting geometry & Bamboo flowering types",
    hardDesc: "Bamboo monocarpic mass flowering physiology, Melia dubia pulp yield mathematics"
  },
  "Tree-Crop Interactions, Canopy Management, Windbreaks & Shelterbelts": {
    desc: "Canopy management (pruning, pollarding, lopping, coppicing), root competition, allelopathy; Windbreaks vs Shelterbelts design, permeability & 2H-20H protection zones.",
    easyDesc: "Definitions of pollarding, coppicing, windbreaks vs shelterbelts",
    medDesc: "Shelterbelt orientation, width standards, height multiplier protection distances (2H to 20H)",
    hardDesc: "Aerodynamic wind velocity displacement profiles & allelochemical bioassay mechanisms"
  },
  "Forestry Policy, Social Forestry, Tree Mensuration & Forest Management": {
    desc: "National Forest Policy 1988 (33% overall, 66% hills), ISFR forest cover status, Social forestry (farm/extension forestry), Joint Forest Management (JFM), CAMPA & tree mensuration (DBH at 1.37m).",
    easyDesc: "National Forest Policy target percentages & DBH standard height (1.37m / 4.5 ft)",
    medDesc: "Quarter girth formula, Indian State of Forest Report (ISFR) biennial metrics & JFM rules",
    hardDesc: "Form factor calculations, tree volume estimations & CAMPA fund statutory compliance"
  },
  // ─── Agronomy ───
  "Agronomy Principles, Crop Classification & Plant Morphology": {
    desc: "Agronomy definition, history, classification by ontogeny (annual, biennial, perennial), taxonomy/families (Poaceae, Fabaceae), photosynthetic pathways (C3, C4, CAM) & morphology.",
    easyDesc: "Agronomy definitions, pioneer founders & basic plant lifecycle classifications",
    medDesc: "C3 vs C4 photosynthetic features & botanical family diagnostic traits (caryopsis)",
    hardDesc: "Rubisco vs PEP carboxylase kinetics, light saturation points & carbon flux physiology"
  },
  "Cereal Crops Cultivation (Rice, Wheat, Maize & Millets)": {
    desc: "Cereal production: Rice (puddled, DSR, SRI, aerobic rice), Wheat (dwarf genes Norin-10, crown roots), Maize (hybrids vs composites) & Millets / Shree Anna (Jowar, Bajra, Ragi).",
    easyDesc: "Cereal common names, Shree Anna millets & standard cultivation terms",
    medDesc: "Seed rates (kg/ha), nursery bed areas, SRI spacing (25x25cm) & critical irrigation stages",
    hardDesc: "Aerobic rice nitrogen dynamics, lodging biomechanics & heterosis breeding equations"
  },
  "Pulse & Oilseed Crops Production": {
    desc: "Pulses (Chickpea, Pigeonpea, Green gram, Black gram) & Oilseeds (Mustard, Groundnut, Soybean, Sunflower) - seed rates, inoculation, shelling % & quality factors.",
    easyDesc: "Major pulse and oilseed names, edible vs non-edible oils & basic legume nitrogen fixation",
    medDesc: "Groundnut shelling percentage (70%), Mustard erucic acid limits & Soybean protein (40-42%)",
    hardDesc: "Rhizobium strain specificity, oil synthesis biochemistry & pegging calcium nutrition"
  },
  "Commercial, Cash & Fiber Crops (Sugarcane, Cotton & Jute)": {
    desc: "Sugarcane (planting methods, sett rates, brix 18-20%, arrowing, ratooning), Cotton (ginning outturn, lint/fuzz, Bt cotton) & Jute (retting, ribboning, golden fiber).",
    easyDesc: "Definitions of ginning, retting, sett rates & cash crop states",
    medDesc: "Brix refractometer ranges (18-20%), ginning percentage (30-35%) & fiber quality grades",
    hardDesc: "Sucrose accumulation enzymology in sugarcane, cotton boll shedding physiology & retting microbiology"
  },
  "Tillage Systems, Seedbed Preparation & Conservation Agriculture": {
    desc: "Primary vs secondary tillage, zero/no-tillage, minimum tillage, stubble mulching, deep tillage & Conservation Agriculture (CA) three pillars (zero tillage, cover, rotation).",
    easyDesc: "Tillage definitions, implements used & primary vs secondary tillage",
    medDesc: "Conservation agriculture requirements, tilth criteria & residue retention percentages",
    hardDesc: "Soil aggregate stability mechanics, draft resistance formulas & carbon sequestration indices"
  },
  "Weed Science, Weed Biology & Chemical Weed Control": {
    desc: "Weed biology, dispersal, parasitic weeds (Cuscuta, Loranthus, Orobanche, Striga - CLOPS), critical period of competition & herbicides (2,4-D, Pendimethalin, Atrazine, Glyphosate).",
    easyDesc: "Weed definitions, parasitic weed host crops & common weed names",
    medDesc: "Herbicide timings (pre-plant, pre-emergence, post-emergence) & active ingredient doses (kg a.i./ha)",
    hardDesc: "Herbicide mode of action (ALS, EPSPS, PSII inhibitors) & resistance management genetics"
  },
  "Harvesting, Post-Harvest Processing & Grain Storage Standards": {
    desc: "Physiological vs harvest maturity, Harvest Index (HI), safe storage moisture contents (10-12% cereals, 8-9% oilseeds), grain storage structures (Pusa bin, silos) & threshing.",
    easyDesc: "Definitions of harvest index & basic harvesting tools",
    medDesc: "Safe storage moisture percentages (10-12% cereals, 8-9% oilseeds) & drying standards",
    hardDesc: "Harvest Index mathematical problems, equilibrium relative humidity & respiration thermodynamics"
  },
  // ─── Agriculture Engineering ───
  "Farm Power Sources, IC Engines & Tractor Mechanics": {
    desc: "Farm power sources (mechanical, electrical, animal), IC engines (diesel vs petrol, 2-stroke vs 4-stroke, thermal efficiency), tractor systems (clutch, differential, PTO at standard 540 rpm & cooling).",
    easyDesc: "Engine types, basic tractor components (clutch, radiator, PTO) & power sources",
    medDesc: "Compression ratios, thermal efficiencies & standard PTO speeds (540 / 1000 rpm)",
    hardDesc: "Indicated vs brake horsepower calculations, valve timing diagrams & governor mechanics"
  },
  "Primary Tillage Implements & Ploughs": {
    desc: "Primary tillage implements: indigenous plough, mouldboard (MB) plough components (share, mouldboard, landside, frog), disc plough (disc angle 40-45°, tilt angle 15-25°), subsoiler & rotavator.",
    easyDesc: "MB plough parts, primary tillage definitions & implement identification",
    medDesc: "Disc plough angles (disc angle 40-45°, tilt angle 15-25°) & subsoiling depths",
    hardDesc: "Specific draft force calculations (kg/cm²), centre of resistance geometry & mouldboard curves"
  },
  "Secondary Tillage, Land Levelling & Laser Levellers": {
    desc: "Secondary tillage machinery: disc harrows, spike/spring tooth harrows, cultivators, land levelers & laser land leveling systems (transmitter, receiver, control box & bucket).",
    easyDesc: "Harrow types, secondary tillage definitions & laser leveller basic components",
    medDesc: "Laser beam accuracy ranges, water saving percentages (20-30%) & disc gang angles",
    hardDesc: "Cut-and-fill volume survey calculations, tractor pull mechanics & grading ergonomics"
  },
  "Sowing, Planting Equipment & Seed Drills": {
    desc: "Seed-cum-fertilizer drill mechanics (hopper, fluted roller / cup feed metering, furrow openers: shoe/disc/shovel), seed drill calibration, precision planters & paddy transplanters.",
    easyDesc: "Seed drill functions, metering mechanism names & planter vs seed drill differences",
    medDesc: "Calibration formulas (wheel circumference, revolutions, seed rate kg/ha) & furrow opener depths",
    hardDesc: "Seed damage percentage optimization, pneumatic metering vacuum dynamics & drop velocity physics"
  },
  "Intercultural, Weeding & Plant Protection Machinery": {
    desc: "Weeders (wheel hoe, cono-weeder for SRI paddy, power weeders), earthing-up equipment (ridgers) & sprayers/dusters (knapsack, foot sprayers, power sprayers, nozzle types & calibration).",
    easyDesc: "Cono-weeder use in SRI rice, sprayer names & common nozzle types",
    medDesc: "Sprayer operating pressures, nozzle discharge rates & droplet size classifications (VMD)",
    hardDesc: "Drift reduction aerodynamics, spray swath deposit uniformity & electrostatic nozzle mechanics"
  },
  "Harvesting, Threshing & Combine Harvesters": {
    desc: "Harvesting equipment (sickles, reapers, mower cutter bar), threshers (spike tooth, rasp bar cylinders) & self-propelled combine harvesters (cutting, threshing, separation & cleaning).",
    easyDesc: "Reaper vs thresher functions, combine harvester operations & sickle serration types",
    medDesc: "Cylinder-concave clearance standards, peripheral cylinder speeds & grain loss thresholds",
    hardDesc: "Threshing efficiency mathematics, concave separation equations & grain shatter physics"
  },
  "Renewable Energy, Post-Harvest Machinery & Farm Mechanization": {
    desc: "Solar water pumping (PM-KUSUM), biogas plants (KVIC vs Deenbandhu models), post-harvest machinery (cleaners, graders, dryers, excavators) & farm mechanization status (kW/ha & SMAM).",
    easyDesc: "Solar pump schemes (PM-KUSUM), biogas plant basic parts & cleaner/grader functions",
    medDesc: "Farm power availability in India (kW/ha), custom hiring centre (CHC) norms & biogas gas ratios",
    hardDesc: "Drying air psychrometrics, heat transfer thermodynamics in solar dryers & mechanization index math"
  }
}

export default function CourseDashboard({ 
  chapters, 
  mistakeCount, 
  bookmarkCount = 0, 
  chapterMistakesCount = {},
  userName 
}: CourseDashboardProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Default to Chapter 16 (Soil) if present, or first available chapter
  const defaultChapter = chapters.find(c => c.name.toLowerCase().includes('soil')) || chapters[0]
  const [activeChapterId, setActiveChapterId] = useState<number>(defaultChapter?.id || chapters[0]?.id || 1)
  const activeChapter = chapters.find(c => c.id === activeChapterId) || defaultChapter || chapters[0]

  const [completedQuizzesList, setCompletedQuizzesList] = useState<number[]>([])
  
  // Collapsible Accordion State: by default, all topics are collapsed for clean navigation
  const [openTopics, setOpenTopics] = useState<Record<string, boolean>>({})

  const toggleTopic = (topic: string) => {
    setOpenTopics(prev => ({
      ...prev,
      [topic]: !prev[topic]
    }))
  }

  const expandAll = () => {
    const all: Record<string, boolean> = {}
    topicGroups.forEach(g => { all[g.topic] = true })
    setOpenTopics(all)
  }

  const collapseAll = () => {
    setOpenTopics({})
  }

  // Mistakes for currently selected chapter in The Forge
  const activeChapterMistakes = activeChapter ? (chapterMistakesCount[activeChapter.id] || 0) : 0

  useEffect(() => {
    // Read from localStorage to find which quizzes are completed
    const completed: number[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('mock_result_')) {
        const quizId = parseInt(key.replace('mock_result_', ''), 10)
        if (!isNaN(quizId)) completed.push(quizId)
      }
    }
    setCompletedQuizzesList(completed)
  }, [])

  // Calculate course stats
  const totalCourseQuizzes = chapters.reduce((acc, c) => acc + c.quizzes.length, 0)
  const totalCourseQuestions = chapters.reduce((acc, c) => acc + c.quizzes.reduce((qAcc, q) => qAcc + q._count.questions, 0), 0)
  const completedCount = completedQuizzesList.length
  const progressPercent = totalCourseQuizzes > 0 ? Math.round((completedCount / totalCourseQuizzes) * 100) : 0

  // Group active chapter quizzes by topic if topic exists
  const hasTopicGrouped = activeChapter ? activeChapter.quizzes.some(q => q.topic) : false

  type TopicGroup = {
    topic: string
    quizzes: Quiz[]
    totalQuestions: number
  }

  const topicGroups: TopicGroup[] = []
  const ungroupedQuizzes: Quiz[] = []

  if (activeChapter) {
    for (const q of activeChapter.quizzes) {
      if (q.topic) {
        let g = topicGroups.find(x => x.topic === q.topic)
        if (!g) {
          g = { topic: q.topic, quizzes: [], totalQuestions: 0 }
          topicGroups.push(g)
        }
        g.quizzes.push(q)
        g.totalQuestions += q._count.questions
      } else {
        ungroupedQuizzes.push(q)
      }
    }

    const diffOrder: Record<string, number> = { EASY: 1, MEDIUM: 2, HARD: 3 }
    for (const g of topicGroups) {
      g.quizzes.sort((a, b) => {
        const oa = diffOrder[a.difficulty || ''] || 99
        const ob = diffOrder[b.difficulty || ''] || 99
        return oa - ob
      })
    }
  }

  const activeChapterTotalQuestions = activeChapter
    ? activeChapter.quizzes.reduce((acc, q) => acc + q._count.questions, 0)
    : 0

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-gray-900 overflow-hidden font-sans">

      {/* Mobile Sidebar Toggle Button */}
      {!sidebarOpen && (
        <button
          className="lg:hidden fixed bottom-6 left-6 z-50 bg-blue-600 text-white p-3.5 rounded-full shadow-2xl flex items-center justify-center cursor-pointer"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* ─── Column 1: Chapter Sidebar (Left) ─── */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 w-[270px] lg:w-[290px] bg-white border-r border-gray-200 
        flex flex-col transform transition-transform duration-300 ease-in-out shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Top Branding Bar */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-gray-200 shrink-0 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-xs">
              LS
            </div>
            <div>
              <span className="text-[14px] font-black text-gray-900 block leading-tight">LiveShala ARD</span>
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Course Syllabus</span>
            </div>
          </div>
          <button className="lg:hidden text-gray-400 hover:text-gray-900" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Course Progress Header */}
        <div className="px-5 py-4 border-b border-gray-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Overall Progress</span>
            <span className="text-[12px] font-black text-blue-600">{progressPercent}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-blue-600 h-full rounded-full transition-all duration-500" 
              style={{ width: `${Math.max(progressPercent, 2)}%` }}
            />
          </div>
          <div className="text-[10px] text-gray-400 mt-1 font-medium flex justify-between">
            <span>{chapters.length} Chapters</span>
            <span>{totalCourseQuestions} Questions</span>
          </div>
        </div>

        {/* Chapters List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          <div className="px-2 pb-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Select Chapter
          </div>

          {chapters.map((chapter, cIdx) => {
            const isSelected = activeChapter?.id === chapter.id
            const totalQ = chapter.quizzes.reduce((acc, q) => acc + q._count.questions, 0)
            const icon = getChapterIcon(chapter.name)

            return (
              <button
                key={chapter.id}
                onClick={() => {
                  setActiveChapterId(chapter.id)
                  if (window.innerWidth < 1024) setSidebarOpen(false)
                }}
                className={`
                  w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer group
                  ${isSelected 
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20' 
                    : 'bg-white hover:bg-slate-100/80 text-gray-800 border border-transparent'
                  }
                `}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-base shrink-0">{icon}</span>
                  <div className="min-w-0">
                    <div className={`text-[13px] font-bold leading-snug truncate ${isSelected ? 'text-white' : 'text-gray-900 group-hover:text-blue-600'}`}>
                      {chapter.name}
                    </div>
                    <div className={`text-[10px] font-medium leading-none mt-0.5 ${isSelected ? 'text-blue-100' : 'text-gray-400'}`}>
                      {totalQ} Questions • {chapter.quizzes.length} Quizzes
                    </div>
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'text-white translate-x-0.5' : 'text-gray-300 group-hover:text-gray-500'}`} />
              </button>
            )
          })}
        </div>

        {/* User Footer */}
        <div className="p-3 border-t border-gray-200 shrink-0 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold shrink-0">
              {userName ? userName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-gray-900 truncate">{userName || 'Student'}</div>
              <div className="text-[10px] text-gray-400">NABARD Grade A</div>
            </div>
          </div>
          <LogOutButton />
        </div>
      </aside>

      {/* ─── Column 2: Main Area (Chapter Header & Direct-Action Topic Cards) ─── */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#F8FAFC]">
        {/* Top Global Header Bar */}
        <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6 lg:px-8 shrink-0">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-gray-500" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400 font-medium">ARD Syllabus</span>
              <span className="text-gray-300">/</span>
              <span className="font-bold text-gray-900 flex items-center gap-1.5">
                <span>{getChapterIcon(activeChapter.name)}</span>
                <span>{activeChapter.name}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/bookmarks"
              className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors shadow-2xs"
              title="Practice marked questions"
            >
              <Bookmark className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>Revision ({bookmarkCount})</span>
            </Link>
            {mistakeCount > 0 && (
              <Link
                href="/redemption"
                className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200/80 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors shadow-2xs"
                title="Practice mistakes in The Forge"
              >
                <Award className="w-3.5 h-3.5 text-red-500" />
                <span>The Forge ({mistakeCount})</span>
              </Link>
            )}
            <a
              href="https://liveshala.com"
              className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-800 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              ← Back to Liveshala
            </a>
          </div>
        </header>

        {/* Scrollable Stage */}
        <div className="flex-1 overflow-y-auto px-6 lg:px-10 py-8">
          <div className="max-w-5xl mx-auto space-y-6">

            {/* ─── Chapter Showcase Header Banner ─── */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 lg:p-8 text-white shadow-sm border border-slate-700/50 relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-400/30">
                    <span>{getChapterIcon(activeChapter.name)}</span>
                    <span className="uppercase tracking-wider">Chapter Module</span>
                  </div>
                  <h1 className="text-2xl lg:text-4xl font-black text-white tracking-tight">
                    {activeChapter.name}
                  </h1>
                  <p className="text-slate-300 text-sm max-w-xl leading-relaxed">
                    {hasTopicGrouped 
                      ? `${activeChapterTotalQuestions} questions organized into ${topicGroups.length} topics across 3 progressive difficulty levels. Fully unlocked.`
                      : `${activeChapterTotalQuestions} questions across ${activeChapter.quizzes.length} comprehensive practice quizzes.`
                    }
                  </p>
                </div>

                {/* Direct Link to Chapter Theory Docs */}
                <Link
                  href={`/chapter/${activeChapter.id}/concepts`}
                  className="inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/40 border border-emerald-400/30 transition-all hover:scale-[1.02] shrink-0"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>
                    {activeChapter._count?.concepts 
                      ? `Read ${activeChapter._count.concepts} Concepts & Notes →` 
                      : 'Read Chapter Theory & Notes →'
                    }
                  </span>
                </Link>
              </div>
            </div>

            {/* ─── Chapter Fast-Action Command Hub (Random Practice, Forge Mistakes, Timed Mock) ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* 1. Random Practice Across All Topics */}
              <Link
                href={`/chapter/${activeChapter.id}/practice`}
                className="flex items-center gap-3.5 p-4 rounded-2xl bg-white border border-blue-200/80 shadow-2xs hover:border-blue-400 hover:shadow-sm hover:bg-blue-50/20 transition-all group cursor-pointer"
              >
                <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200/60 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-100 group-hover:scale-105 transition-all shadow-2xs">
                  <Shuffle className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black text-gray-900 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                    <span>Random Practice</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded">Shuffle</span>
                  </div>
                  <div className="text-[11px] text-gray-500 font-medium truncate mt-0.5">
                    Random Qs across all sub-topics
                  </div>
                </div>
              </Link>

              {/* 2. Chapter Forge Mistakes */}
              {activeChapterMistakes > 0 ? (
                <Link
                  href={`/redemption/quiz?chapterId=${activeChapter.id}&all=true`}
                  className="flex items-center gap-3.5 p-4 rounded-2xl bg-white border border-rose-200/90 shadow-2xs hover:border-rose-400 hover:shadow-sm hover:bg-rose-50/20 transition-all group cursor-pointer"
                >
                  <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-200/60 text-rose-600 flex items-center justify-center shrink-0 group-hover:bg-rose-100 group-hover:scale-105 transition-all shadow-2xs">
                    <Flame className="w-5 h-5 fill-rose-500/30 text-rose-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-rose-700 group-hover:text-rose-800 transition-colors flex items-center gap-1.5">
                      <span>The Forge ({activeChapterMistakes})</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 bg-rose-100 text-rose-800 rounded">Gaps</span>
                    </div>
                    <div className="text-[11px] text-gray-500 font-medium truncate mt-0.5">
                      Drill {activeChapter.name} mistakes
                    </div>
                  </div>
                </Link>
              ) : (
                <div
                  className="flex items-center gap-3.5 p-4 rounded-2xl bg-white border border-gray-200/70 shadow-2xs opacity-85"
                >
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200/60 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-gray-800">
                      The Forge (0 Mistakes)
                    </div>
                    <div className="text-[11px] text-emerald-600 font-bold truncate mt-0.5">
                      Chapter is 100% clean!
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Random Mock Exam (Timed) */}
              <Link
                href={`/chapter/${activeChapter.id}/mock`}
                className="flex items-center gap-3.5 p-4 rounded-2xl bg-white border border-indigo-200/80 shadow-2xs hover:border-indigo-400 hover:shadow-sm hover:bg-indigo-50/20 transition-all group cursor-pointer"
              >
                <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-200/60 text-indigo-600 flex items-center justify-center shrink-0 group-hover:bg-indigo-100 group-hover:scale-105 transition-all shadow-2xs">
                  <Zap className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black text-gray-900 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                    <span>Random Mock Exam</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded">Timed</span>
                  </div>
                  <div className="text-[11px] text-gray-500 font-medium truncate mt-0.5">
                    50 Qs • Negative Marking
                  </div>
                </div>
              </Link>
            </div>

            {/* ─── Section Header with Expand / Collapse All Controls ─── */}
            <div className="flex items-center justify-between pt-2">
              <div>
                <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-600" />
                  <span>Topic Modules & Difficulty Quizzes</span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Click any topic to expand its 3 difficulty levels (Easy, Medium, Hard).
                </p>
              </div>

              {hasTopicGrouped && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={expandAll}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer"
                  >
                    Expand All
                  </button>
                  <button
                    onClick={collapseAll}
                    className="text-[11px] font-bold text-gray-500 hover:text-gray-800 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    Collapse All
                  </button>
                </div>
              )}
            </div>

            {/* ─── Collapsible Accordion Topic Cards Grid ─── */}
            {hasTopicGrouped ? (
              <div className="space-y-4">
                {topicGroups.map((group, tIdx) => {
                  const isOpen = !!openTopics[group.topic]
                  const meta = TOPIC_METADATA[group.topic] || {
                    desc: "Comprehensive question set covering this syllabus topic.",
                    easyDesc: "Core definitions & foundational terminology",
                    medDesc: "Standard facts, ranges & numerical values",
                    hardDesc: "Formulas, calculations & tricky exam traps"
                  }

                  const easyQuiz = group.quizzes.find(q => q.difficulty === 'EASY')
                  const medQuiz = group.quizzes.find(q => q.difficulty === 'MEDIUM')
                  const hardQuiz = group.quizzes.find(q => q.difficulty === 'HARD')

                  return (
                    <div 
                      key={group.topic}
                      className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                        isOpen 
                          ? 'border-blue-300 shadow-sm ring-1 ring-blue-500/10' 
                          : 'border-gray-200/90 shadow-2xs hover:border-gray-300'
                      }`}
                    >
                      {/* Accordion Trigger Header */}
                      <button 
                        type="button"
                        onClick={() => toggleTopic(group.topic)}
                        className="w-full text-left p-5 lg:p-6 bg-slate-50/60 hover:bg-slate-100/70 transition-colors flex items-center justify-between gap-4 cursor-pointer"
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-lg bg-blue-600/10 text-blue-700 text-xs font-black flex items-center justify-center shrink-0">
                              {tIdx + 1}
                            </span>
                            <h3 className="text-base lg:text-lg font-black text-gray-900 leading-tight">
                              {group.topic}
                            </h3>
                          </div>
                          <p className="text-xs text-gray-500 font-medium pl-8.5 line-clamp-1 sm:line-clamp-none">
                            {meta.desc}
                          </p>
                        </div>

                        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                          {/* Mini Level Indicators (visible when collapsed) */}
                          <div className="hidden sm:flex items-center gap-1 text-[11px] font-bold">
                            {easyQuiz && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                                🟢 {easyQuiz._count.questions}
                              </span>
                            )}
                            {medQuiz && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                                🟡 {medQuiz._count.questions}
                              </span>
                            )}
                            {hardQuiz && (
                              <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200">
                                🔴 {hardQuiz._count.questions}
                              </span>
                            )}
                          </div>

                          <span className="inline-block px-3 py-1 rounded-full bg-white border border-gray-200 text-xs font-bold text-gray-700 shadow-2xs">
                            {group.totalQuestions} Qs
                          </span>

                          <div className={`w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180 bg-blue-50 text-blue-600 border-blue-200' : ''}`}>
                            <ChevronDown className="w-4 h-4" />
                          </div>
                        </div>
                      </button>

                      {/* 3 Difficulty Level Rows with Direct Action Buttons (Revealed when open) */}
                      {isOpen && (
                        <div className="divide-y divide-gray-100 border-t border-gray-100 bg-white">
                          {group.quizzes.map((quiz) => {
                            const isEasy = quiz.difficulty === 'EASY'
                            const isMed = quiz.difficulty === 'MEDIUM'
                            const isHard = quiz.difficulty === 'HARD'
                            const isCompleted = completedQuizzesList.includes(quiz.id)

                            const levelLabel = isEasy ? 'Level 1: Easy' : isMed ? 'Level 2: Medium' : 'Level 3: Hard'
                            const levelBadgeBg = isEasy 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                              : isMed 
                              ? 'bg-amber-50 text-amber-800 border-amber-200' 
                              : 'bg-rose-50 text-rose-800 border-rose-200'

                            const levelIcon = isEasy ? '🟢' : isMed ? '🟡' : '🔴'
                            const levelScope = isEasy ? meta.easyDesc : isMed ? meta.medDesc : meta.hardDesc

                            return (
                              <div 
                                key={quiz.id}
                                className="p-4 lg:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/40 transition-colors"
                              >
                                {/* Level Identity & Info */}
                                <div className="flex items-start gap-3 min-w-0">
                                  <span className="text-base shrink-0 mt-0.5">{levelIcon}</span>
                                  <div className="space-y-0.5 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`text-[11px] font-black uppercase px-2 py-0.5 rounded border ${levelBadgeBg}`}>
                                        {levelLabel}
                                      </span>
                                      <span className="text-xs font-bold text-gray-800">
                                        {quiz._count.questions} Questions ({quiz._count.questions} Marks)
                                      </span>
                                      {isCompleted && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                                          <CheckCircle2 className="w-3 h-3 text-green-600" /> Completed
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-500 font-medium">
                                      {levelScope}
                                    </p>
                                  </div>
                                </div>

                                {/* Direct Launch Buttons (Practice & Exam) */}
                                <div className="flex items-center gap-2 pl-7 md:pl-0 shrink-0">
                                  <Link
                                    href={`/quiz/${quiz.id}/practice`}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-600 hover:text-white transition-all shadow-2xs group"
                                    title="Practice with instant Edge-TTS voice explanations and bookmarks"
                                  >
                                    <Play className="w-3.5 h-3.5 fill-current transition-transform group-hover:scale-110" />
                                    <span>Practice Mode</span>
                                  </Link>

                                  <Link
                                    href={`/quiz/${quiz.id}/instructions`}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 hover:bg-gray-800 hover:text-white transition-all shadow-2xs"
                                    title="Attempt as timed mock test with negative marking"
                                  >
                                    <Zap className="w-3.5 h-3.5" />
                                    <span>Timed Exam</span>
                                  </Link>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              /* Fallback for Chapters not yet topic-grouped (e.g. Agri Engineering) */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeChapter.quizzes.map((quiz, qIdx) => {
                  const isCompleted = completedQuizzesList.includes(quiz.id)
                  return (
                    <div 
                      key={quiz.id}
                      className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-5 hover:border-gray-300 transition-all flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            Quiz {qIdx + 1}
                          </span>
                          <span className="text-xs font-bold text-gray-600">
                            {quiz._count.questions} Qs
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-gray-900 leading-snug">
                          {quiz.name}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                        <Link
                          href={`/quiz/${quiz.id}/practice`}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-600 hover:text-white transition-all shadow-2xs"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Practice Mode</span>
                        </Link>
                        <Link
                          href={`/quiz/${quiz.id}/instructions`}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 hover:bg-gray-800 hover:text-white transition-all shadow-2xs"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>Timed Exam</span>
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

          </div>
        </div>
      </main>

    </div>
  )
}
