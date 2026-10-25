const fs = require('fs');
const path = require('path');

const items = JSON.parse(fs.readFileSync('scratch_structure_aggregation.json', 'utf8'));

const orderMap = {
  'Soil Structure': 1,
  'Peds': 2,
  'Aggregates': 3,
  'Granular Structure': 4,
  'Crumb Structure': 5,
  'Platy Structure': 6,
  'Blocky Structure': 7,
  'Prismatic Structure': 8,
  'Columnar Structure': 9,
  'Single-Grained Condition': 10,
  'Massive Condition': 11,
  'Soil Aggregation': 12
};

items.sort((a, b) => (orderMap[a.term] || 99) - (orderMap[b.term] || 99));

let doc = `# AUDIO REVISION MASTERCLASS: SOIL STRUCTURE & AGGREGATION (12 KEYWORDS)
### Target Examinations: ICAR-AIEEA / JRF, IBPS-AFO, State AO / AAO, NABARD Grade A, UPSC-Agriculture
### Module: Soil Physical Properties & Soil Physics > Soil Structure & Aggregation

> **DIRECTIVE FOR NOTEBOOKLM AUDIO OVERVIEW / PODCAST HOSTS:**
> - You are two distinguished Soil Physics and Soil Management professors delivering an authoritative, high-yield audio revision masterclass.
> - The student is listening to this audio while actively viewing the **"Soil Structure & Aggregation"** subcategory on their platform screen.
> - **Follow-Along Rule**: Clearly announce each keyword by number and exact name in numerical order (Keywords 1 to 12) before diving into its explanation so the student can follow along seamlessly on their screen.
> - **Pedagogical Style**: Conversational, engaging, and intellectually rigorous. Dynamic banter between two coaches. Use vivid architectural analogies (bricks and mortar, bread crumb porosity vs flat stacked floor tiles, towering columns with salt-bleached domed caps), precise horizon locations, chemical binding mechanisms (calcium bridges vs sodium dispersion), and call out the classic "examiner traps" and trick questions found in past competitive papers.
> - **Core Comparisons & Themes to Emphasize**:
>   * **Soil Structure vs Soil Texture**: Texture is permanent and inherent (cannot be altered by tillage); Structure is dynamic and easily modified, improved, or destroyed by cultural operations, compaction, and organic management.
>   * **Peds vs Clods vs Concretions**:
>     - **Peds**: Natural, persistent structural units formed by pedogenic processes.
>     - **Clods**: Artificial, temporary structural masses produced by mechanical disturbance / plowing.
>     - **Concretions**: Hard, cemented chemical concentrations ($CaCO_3$, $Fe/Mn$ oxides).
>   * **Structural Classification Criteria**: Type (shape/form), Class (size: very fine to very coarse), and Grade (degree of distinctness: structureless, weak, moderate, strong).
>   * **The 4 Major Structural Types & Horizon Zonation**:
>     1. **Spheroidal (Granular & Crumb)**: Confined to surface **A-horizon** (topsoil).
>     2. **Platy (Plate-like)**: Sub-surface **A / E horizon**, virgin forest soils, or induced **plow pans / hardpans**. Restricts vertical drainage and root penetration.
>     3. **Blocky (Angular & Subangular)**: Diagnostic of the subsoil **B-horizon** (illuvial clay accumulation, $Bt$).
>     4. **Prism-like (Prismatic & Columnar)**: Deep subsoil **B-horizon** of arid/semi-arid regions.
>   * **The Prismatic vs Columnar Master Distinction**:
>     - **Prismatic**: Vertical pillars with **flat, level tops**.
>     - **Columnar**: Vertical pillars with **rounded, domed tops** — the classic diagnostic indicator of **Sodic / Solonetz / Alkali soils** ($ESP > 15\\%, pH > 8.5$).
>   * **Granular vs Crumb Structure**: Both are spheroidal, but **Crumb is more porous, softer, and spongy**, representing the single best structural condition for crop cultivation.
>   * **Structureless Conditions**:
>     - **Single-Grained**: Coarse sand dunes and beach sands; zero aggregation, loose individual grains.
>     - **Massive**: Heavy clay subsoils or puddled paddy soils; cemented into a giant solid block without natural planes of weakness.
>   * **The Aggregation & Flocculation Mechanism**:
>     - **Flocculation**: Divalent $Ca^{2+}$ and trivalent $Al^{3+}, Fe^{3+}$ compress the electrical double layer and flocculate clay; Monovalent $Na^+$ disperses clay.
>     - **Cementing Agents**: **Glomalin** (super-glue glycoprotein produced by arbuscular mycorrhizal fungi), microbial polysaccharides, humic polymers, and sesquioxides.
>     - **Macro-aggregates (> 0.25 mm)** bound by fungal hyphae and roots; **Micro-aggregates (< 0.25 mm)** bound by organo-mineral complexes.

---

`;

for (let i = 0; i < items.length; i++) {
  const c = items[i];
  doc += `### Keyword ${i + 1}: ${c.term}\n\n`;
  doc += `**Platform Definition:**\n> "${c.definition}"\n\n`;

  if (c.content) {
    doc += `**High-Yield Study Notes & Comparative Matrices:**\n`;
    doc += `${c.content.trim()}\n\n`;
  }

  // Inject authoritative exam pointers
  if (c.term === 'Soil Structure') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Dynamic Management Property**: Unlike texture, soil structure is continuously modified by agronomic practices—enhanced by organic manures, cover crops, and optimal moisture tillage; destroyed by excessive tillage, puddling, compaction, and sodium accumulation.\n`;
    doc += `- **The Three Morphological Descriptors (Soil Survey Standards)**:\n`;
    doc += `  * **Type**: Physical shape and arrangement of peds (Platy, Prismatic, Columnar, Angular Blocky, Subangular Blocky, Granular, Crumb).\n`;
    doc += `  * **Class**: Size dimension of individual peds (Very fine, Fine, Medium, Coarse, Very coarse).\n`;
    doc += `  * **Grade**: Strength, stability, and distinctness of aggregation (0: Structureless, 1: Weak, 2: Moderate, 3: Strong).\n`;
    doc += `- **Agronomic Functions**: Directly governs pore size distribution (ratio of macropores to micropores), hydraulic conductivity, infiltration rate, soil aeration, root penetration resistance, and seedbed tilth.\n\n`;
  } else if (c.term === 'Peds') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Natural Genetic Unit**: A ped is an aggregate formed naturally by pedogenic processes (wetting-drying cycles, freezing-thawing, root exudates, microbial binding) with natural planes of weakness.\n`;
    doc += `- **Diagnostic Distinctions (High-Yield Exam Trap)**:\n`;
    doc += `  * **Ped**: Natural, durable structural unit persisting across repeated wet-dry cycles.\n`;
    doc += `  * **Clod**: Artificial mass formed by mechanical tillage manipulation of moist/wet soil; lacks natural cleavage planes.\n`;
    doc += `  * **Concretion**: Chemical precipitation nodule ($CaCO_3, Fe, Mn$) formed by solute deposition.\n`;
    doc += `  * **Fragment**: Broken piece of a ped produced during handling or sampling.\n\n`;
  } else if (c.term === 'Aggregates') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Aggregate Hierarchy Model (Tisdall & Oades)**:\n`;
    doc += `  * **Micro-aggregates ($< 0.25\\text{ mm}$ or $< 250\\text{ }\\mu\\text{m}$)**: Composed of clay domains bound to organic molecules by polyvalent cation bridges ($Ca^{2+}, Fe^{3+}, Al^{3+}$). Extremely stable; unaffected by ordinary plowing; persist for decades.\n`;
    doc += `  * **Macro-aggregates ($> 0.25\\text{ mm}$)**: Built from clusters of micro-aggregates bound together by transient organic materials, fungal hyphae, and plant roots. Highly sensitive to mechanical tillage and aggregate slaking.\n`;
    doc += `- **Water-Stable Aggregates (WSA)**: The primary diagnostic metric of soil resistance to water erosion and crusting, measured using the **Yoder wet-sieving apparatus**.\n\n`;
  } else if (c.term === 'Granular Structure') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Morphology**: Rounded, non-porous or moderately porous spheroidal peds (1 to 10 mm) that do not fit closely together, leaving generous inter-pedal void spaces.\n`;
    doc += `- **Exclusive Topsoil Occurrence**: Strictly confined to the **surface A-horizon**; never found in subsoil B-horizons.\n`;
    doc += `- **Agronomic Value**: Provides an optimal balance of rapid water infiltration through macropores and water retention within peds, making it the standard healthy agricultural topsoil structure.\n\n`;
  } else if (c.term === 'Crumb Structure') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **The Spongy Ideal**: A specialized subtype of spheroidal structure that is **significantly more porous and spongy** than granular structure, closely resembling soft bread crumbs.\n`;
    doc += `- **Top Choice in Agricultural Exams**: When an exam question asks: *"Which soil structure is most favorable and ideal for agricultural crop production?"*, the answer is universally **Crumb Structure** (followed by Granular).\n`;
    doc += `- **Genesis**: Formed under abundant organic matter additions, extensive grass rhizosphere root systems, and intensive earthworm tunneling and casting.\n\n`;
  } else if (c.term === 'Platy Structure') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Morphological Orientation**: Horizontal axis is significantly longer than the vertical axis; thin plates or leaflets stacked horizontally.\n`;
    doc += `- **Natural Horizons**: Characteristic of **E-horizons** (leached, albic zones in podzolic and forest soils) and sub-surface A-horizons.\n`;
    doc += `- **Agricultural Impediment / Plow Pans**: Platy structure frequently develops artificially right beneath the plow layer (**Plow Pan / Traffic Pan**) due to downward wheel compaction by heavy tractors and the smearing action of plow bottoms.\n`;
    doc += `- **Hydraulic Restriction**: Creates severe horizontal tortuosity, drastically reducing vertical water infiltration and perching water tables, while mechanically impeding downward root penetration.\n\n`;
  } else if (c.term === 'Blocky Structure') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Morphological Geometry**: Three dimensions approximately equal, forming cube-like polyhedral peds (typically 5 to 50 mm).\n`;
    doc += `- **Sub-types (Exam Favorite)**:\n`;
    doc += `  * **Angular Blocky**: Sharp edges, planar faces, and distinct acute vertices. Prominent in heavy clay illuvial horizons.\n`;
    doc += `  * **Subangular Blocky**: Mixed planar and rounded faces with dulled, smoothed edges; allows better root passage than angular blocky.\n`;
    doc += `- **Subsoil B-Horizon Indicator**: Diagnostic of the **B-horizon (zone of illuvial clay accumulation, $Bt$)**. When subsoils dry, shrinkage cracks form along the blocky ped faces.\n\n`;
  } else if (c.term === 'Prismatic Structure') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Morphological Dimensions**: Vertical pillar-like units where the **vertical axis is distinctly longer than the horizontal axis** (vertical elongation).\n`;
    doc += `- **The Diagnostic Feature: FLAT TOPS**: Prismatic units have **flat, planar, level horizontal tops** with sharp, well-defined vertical edges.\n`;
    doc += `- **Occurrence**: Typical of the subsoil **B-horizon** of soils in arid, semi-arid, and sub-humid grassland regions (e.g., Mollisols, Alfisols).\n`;
    doc += `- **Swelling & Shrinking**: Vertical boundary fissures allow deep percolation during initial rainfall before swelling clays close the cracks.\n\n`;
  } else if (c.term === 'Columnar Structure') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **The Diagnostic Feature: ROUNDED / DOMED TOPS**: Vertical pillars with **characteristically rounded, domed caps**—often capped by a white, bleached dusting of secondary silica or silt.\n`;
    doc += `- **The Ultimate Chemical Fingerprint (Classic Exam Trap)**: Columnar structure is the universal diagnostic morphological fingerprint of **Sodic / Solonetz / Alkali soils**!\n`;
    doc += `- **Key Chemical Criteria**: Associated with an **Exchangeable Sodium Percentage ($ESP > 15\\%$)** and high **$pH > 8.5$**.\n`;
    doc += `- **Genesis Mechanism**: High exchangeable sodium hydrolyzes and disperses illuvial clay. As the dispersed clay shrinks into vertical columns during extreme drying, subsequent rainwater washing down the cracks erodes and rounds off the upper corners into distinctive domes.\n\n`;
  } else if (c.term === 'Single-Grained Condition') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Structureless State 1**: Primary particles exist completely free and unattached, with zero cementing or ped formation.\n`;
    doc += `- **Typical Landscapes**: Coastal beach sands, active desert sand dunes, and deep gravelly C-horizons.\n`;
    doc += `- **Hydraulic Dynamics**: Rapid percolation through macropores, zero capillary water retention, zero cohesion, and extreme susceptibility to wind erosion.\n\n`;
  } else if (c.term === 'Massive Condition') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Structureless State 2**: Soil particles are cemented together into a single, continuous, coherent mass lacking any natural planes of weakness, fissures, or identifiable individual peds.\n`;
    doc += `- **Typical Occurrences**:\n`;
    doc += `  * Dense, compacted subsoil claypans and deep C-horizons.\n`;
    doc += `  * **Puddled Paddy Soils**: Deliberately created in lowland rice cultivation by tilling under waterlogged saturated conditions to destroy structural aggregates, forming a massive plow layer that minimizes percolation loss of ponded water.\n`;
    doc += `- **Agronomic Limitations**: Extremely poor aeration, low oxygen diffusion rate (ODR), and massive root impedance for upland crops.\n\n`;
  } else if (c.term === 'Soil Aggregation') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **The Two Master Phases**:\n`;
    doc += `  1. **Flocculation**: Electrostatic bringing together of colloidal clay particles into domains. Polyvalent cations (**$Ca^{2+}, Mg^{2+}, Al^{3+}, Fe^{3+}$**) compress the electrical double layer and induce flocculation; Monovalent **$Na^+$** causes repulsion and dispersion.\n`;
    doc += `  2. **Cementation / Binding**: Permanent chemical and biological gluing of flocculated particles into durable aggregates.\n`;
    doc += `- **Key Biological Cementing Agents**:\n`;
    doc += `  * **Glomalin**: An insoluble, hydrophobic glycoprotein produced by **Arbuscular Mycorrhizal (AM) fungi** that acts as the "nature's super-glue" for soil aggregates.\n`;
    doc += `  * **Microbial Polysaccharides & Gums**: Exuded by bacteria and actinomycetes.\n`;
    doc += `  * **Humic & Fulvic Substances**: Form polyvalent cation bridges with clay surfaces ($Clay-Ca^{2+}-Humus$).\n`;
    doc += `  * **Sesquioxides ($Fe_2O_3, Al_2O_3$)**: Provide irreversible electrostatic cementation in tropical Oxisols and Ultisols.\n\n`;
  }

  // Exam Traps from database
  if (c.examTraps) {
    doc += `**Examiner Traps & PYQ Alerts:**\n`;
    doc += `${c.examTraps.trim()}\n\n`;
  }

  doc += `---\n\n`;
}

// Write to Notes/Audio_Briefs/02B_soil_structure_and_aggregation_12_keywords.md
const outDir = path.join(__dirname, '..', 'Notes', 'Audio_Briefs');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}
const outPath = path.join(outDir, '02B_soil_structure_and_aggregation_12_keywords.md');
fs.writeFileSync(outPath, doc, 'utf8');
console.log('Successfully generated audio brief at:', outPath);
console.log('File size:', fs.statSync(outPath).size, 'bytes');
