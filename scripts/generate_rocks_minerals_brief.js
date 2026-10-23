const fs = require('fs');
const path = require('path');

const items = JSON.parse(fs.readFileSync('scratch_rocks_minerals.json', 'utf8'));

let doc = `# AUDIO REVISION MASTERCLASS: ROCKS & PRIMARY/SECONDARY MINERALS (13 KEYWORDS)
### Target Examinations: ICAR-AIEEA / JRF, IBPS-AFO, State AO / AAO, NABARD Grade A, UPSC-Agriculture
### Module: Soil Fundamentals, Genesis & Weathering > Rocks & Primary/Secondary Minerals

> **DIRECTIVE FOR NOTEBOOKLM AUDIO OVERVIEW / PODCAST HOSTS:**
> - You are two distinguished Soil Science and Agriscience exam coaches delivering an authoritative, high-yield audio revision masterclass.
> - The student is listening to this audio while actively viewing the **"Rocks & Primary/Secondary Minerals"** subcategory on their platform screen.
> - **Follow-Along Rule**: Clearly announce each keyword by number and exact name in numerical order (Keywords 1 to 13) before diving into its explanation so the student can follow along seamlessly on their screen.
> - **Pedagogical Style**: Conversational, energetic, and intellectually rigorous. Use clear geological and physical analogies, state exact chemical formulas and percentages, and call out the classic "examiner traps" and trick questions found in past competitive papers.
> - **Core Comparisons to Emphasize**:
>   * The Rock Cycle: Primary Igneous &rarr; Secondary Sedimentary (lithification) &rarr; Metamorphic (heat/pressure).
>   * Granite (acidic intrusive, >65% SiO2, coarse-grained) vs Basalt (basic extrusive, 40-55% SiO2, fine-grained, parent material of Black Cotton / Vertisols).
>   * The Metamorphic Conversions: Granite &rarr; Gneiss, Basalt/Shale &rarr; Schist, Sandstone &rarr; Quartzite, Shale &rarr; Slate, Limestone &rarr; Marble.
>   * Earth's Crust Mineral Abundance: Feldspars (48%) > Quartz (36%) > Micas (10%).
>   * Goldich's Dissolution / Weathering Stability Series: Quartz (most resistant, tectosilicate) &rarr; Muscovite &rarr; Feldspars &rarr; Biotite/Hornblende &rarr; Olivine/Calcite (least resistant, dissolves first).
>   * Primary minerals (crystallized from magma, dominate sand/silt) vs Secondary minerals (neoformed by chemical weathering, dominate clay fraction <2 µm).

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

  // Extra master notes exam facts injection per keyword
  if (c.term === 'Igneous Rocks') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Classification by Silica**: Acid (>65% SiO2; e.g. Granite, Rhyolite), Intermediate (56-65% SiO2; e.g. Syenite, Diorite), Basic (40-55% SiO2; e.g. Basalt, Gabbro), Ultrabasic (<40% SiO2; e.g. Peridotite).\n`;
    doc += `- **Intrusive (Plutonic)**: Slow cooling beneath the crust allows large visible crystals (coarse texture: Granite, Gabbro).\n`;
    doc += `- **Extrusive (Volcanic)**: Rapid cooling on the Earth surface creates microscopic crystals (fine texture: Basalt, Obsidian).\n\n`;
  } else if (c.term === 'Sedimentary Rocks') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Lithification Sequence**: Weathering &rarr; Erosion &rarr; Transportation &rarr; Sedimentation &rarr; Diagenesis / Cementation.\n`;
    doc += `- **Key Examples**: Sandstone (cemented quartz sand), Shale (consolidated clay/silt), Limestone (CaCO3), Dolomite (CaMg(CO3)2), Conglomerate (rounded gravels).\n`;
    doc += `- **Stratification**: Exhibit distinct bedding planes and frequently contain organic fossils.\n\n`;
  } else if (c.term === 'Metamorphic Rocks') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Classic Transformations Tested in Exams**:\n`;
    doc += `  * Granite (Igneous) &rarr; **Gneiss** (Foliated band structure)\n`;
    doc += `  * Basalt / Shale &rarr; **Schist** (Platy mineral alignment)\n`;
    doc += `  * Sandstone (Sedimentary) &rarr; **Quartzite** (Non-foliated, fused quartz grains)\n`;
    doc += `  * Shale (Sedimentary) &rarr; **Slate** (Dense, planar slaty cleavage)\n`;
    doc += `  * Limestone (Sedimentary) &rarr; **Marble** (Recrystallized calcite)\n\n`;
  } else if (c.term === 'Basalt') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Deccan Traps & Regur**: Extensive volcanic basalt flows in Maharashtra, Madhya Pradesh, and Gujarat formed the parent material for Indian **Black Soils (Vertisols)**.\n`;
    doc += `- **Mineral Makeup**: Rich in plagioclase feldspars, augite/pyroxenes, and olivine, with low silica (40-55%) and high Fe, Mg, Ca, causing rapid weathering.\n\n`;
  } else if (c.term === 'Granite') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Red Soil Genesis**: Granite and granite-gneiss are the primary parent rocks of Indian **Red Soils (Alfisols)** in Tamil Nadu, Karnataka, and Andhra Pradesh.\n`;
    doc += `- **Silica & Minerals**: Acidic rock (>65% SiO2) composed primarily of quartz (clear/white), orthoclase feldspar (pink/buff), and mica (black biotite/silver muscovite).\n\n`;
  } else if (c.term === 'Quartz') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Mohs Hardness**: Exactly **7**; lacks cleavage, exhibits conchoidal fracture.\n`;
    doc += `- **Extreme Weathering Resistance**: Positioned at the very top of Goldich's dissolution stability series; dominates the coarse and fine sand fractions of soils.\n\n`;
  } else if (c.term === 'Feldspar') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Crustal Dominance**: **48% of the Earth's crust** by weight, making it the single most abundant mineral group.\n`;
    doc += `- **Potassium Reserve**: **Orthoclase** ($KAlSi_3O_8$) is the primary source of natural soil potassium.\n`;
    doc += `- **Plagioclase Series**: Solid solution from Albite ($NaAlSi_3O_8$) to Anorthite ($CaAl_2Si_2O_8$), supplying soil Ca and Na.\n\n`;
  } else if (c.term === 'Mica') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Phyllosilicate Architecture**: Perfect one-directional basal cleavage allowing thin, flexible sheets.\n`;
    doc += `- **Muscovite vs Biotite**: Muscovite (dioctahedral white mica) is highly resistant to weathering; Biotite (trioctahedral black mica, rich in Fe2+ and Mg2+) weathers rapidly via oxidation.\n\n`;
  } else if (c.term === 'Olivine') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Goldich & Bowen Contrast**: Crystallizes first in Bowen's reaction series at highest temperatures, making it the **least stable / most rapidly weathered** primary silicate mineral under Earth surface conditions.\n`;
    doc += `- **Nesosilicate Structure**: Individual isolated [SiO4]4- tetrahedra bonded only by Fe2+ and Mg2+ cations, easily cleaved by acidic water into serpentine.\n\n`;
  } else if (c.term === 'Amphiboles') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Double-Chain Inosilicate**: Typical member is **Hornblende** with characteristic 56° and 124° cleavage angles.\n`;
    doc += `- **Weathering Behavior**: Moderate to low resistance; significant source of iron, magnesium, and calcium in soil genesis.\n\n`;
  } else if (c.term === 'Calcite') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Carbonate Chemistry**: $CaCO_3$, effervesces vigorously with dilute (0.1 N) HCl.\n`;
    doc += `- **Soil Accumulation**: Forms diagnostic calcic horizons (Bk) and kankar nodules in semi-arid and arid soils.\n\n`;
  } else if (c.term === 'Primary Minerals') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Particle Size Locus**: Concentrated primarily in the **sand (0.02 - 2.0 mm)** and **silt (0.002 - 0.02 mm)** fractions of soil.\n`;
    doc += `- **Essential vs Accessory**: Essential minerals (Feldspar, Quartz, Mica) define the rock; Accessory minerals (Tourmaline, Zircon, Magnetite) occur in trace amounts (<1-2%).\n\n`;
  } else if (c.term === 'Secondary Minerals') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Colloidal Dominance**: Concentrated in the **clay fraction (<0.002 mm / <2 µm)**.\n`;
    doc += `- **Major Classes**: Layer silicate clays (Kaolinite, Montmorillonite, Illite), hydrous sesquioxides (Hematite Fe2O3, Goethite FeOOH, Gibbsite Al(OH)3), and carbonates/sulfates (Calcite, Gypsum).\n\n`;
  }

  if (c.examTraps) {
    doc += `**Examiner Traps & PYQ Alerts:**\n`;
    doc += `${c.examTraps.trim()}\n\n`;
  }

  doc += `---\n\n`;
}

const targetFile = path.join(__dirname, '..', 'Notes', 'Audio_Briefs', '01B_rocks_and_primary_secondary_minerals_13_keywords.md');
fs.writeFileSync(targetFile, doc, 'utf8');
console.log(`Generated Rocks & Minerals Audio Brief at: ${targetFile} (${(doc.length / 1024).toFixed(1)} KB)`);
