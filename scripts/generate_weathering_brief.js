const fs = require('fs');
const path = require('path');

const items = JSON.parse(fs.readFileSync('scratch_weathering.json', 'utf8'));

let doc = `# AUDIO REVISION MASTERCLASS: WEATHERING PROCESSES (10 KEYWORDS)
### Target Examinations: ICAR-AIEEA / JRF, IBPS-AFO, State AO / AAO, NABARD Grade A, UPSC-Agriculture
### Module: Soil Fundamentals, Genesis & Weathering > Weathering Processes

> **DIRECTIVE FOR NOTEBOOKLM AUDIO OVERVIEW / PODCAST HOSTS:**
> - You are two distinguished Soil Science and Agriscience exam coaches delivering an authoritative, high-yield audio revision masterclass.
> - The student is listening to this audio while actively viewing the **"Weathering Processes"** subcategory on their platform screen.
> - **Follow-Along Rule**: Clearly announce each keyword by number and exact name in numerical order (Keywords 1 to 10) before diving into its explanation so the student can follow along seamlessly on their screen.
> - **Pedagogical Style**: Conversational, energetic, and intellectually rigorous. Use clear physical and chemical analogies, state exact chemical reactions, volume changes, and formulas, and call out the classic "examiner traps" and trick questions found in past competitive papers.
> - **Core Comparisons to Emphasize**:
>   * Physical Weathering (disintegration without chemical change; increases surface area) vs Chemical Weathering (decomposition forming secondary minerals; dominant in warm/humid climates).
>   * Frost Wedging: Water expands by **~9% upon freezing**, exerting up to 200 MPa pressure inside rock pores.
>   * Exfoliation (onion-skin spalling driven by unloading and diurnal temperature swings) vs Spheroidal Weathering (chemical weathering working inwards along joint intersections).
>   * Hydration vs Hydrolysis: **Hydration** attaches intact $H_2O$ molecules into the lattice (e.g., Anhydrite &rarr; Gypsum; Hematite &rarr; Limonite), while **Hydrolysis** chemically splits water into $H^+$ and $OH^-$ ions to destroy the primary framework and synthesize clay minerals (e.g., Orthoclase &rarr; Kaolinite).
>   * Oxidation ($Fe^{2+} \rightarrow Fe^{3+}$, loss of electrons, red/brown colors, well-aerated $+400\text{ to }+700\text{ mV}$) vs Reduction ($Fe^{3+} \rightarrow Fe^{2+}$, gain of electrons, bluish-grey gleying, waterlogged $< -100\text{ mV}$).
>   * Carbonation: Soil air $CO_2$ ($0.30\%$, 10x atmospheric) forms carbonic acid $H_2CO_3$, dissolving insoluble $CaCO_3$ into soluble $Ca(HCO_3)_2$.

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
  if (c.term === 'Physical Weathering') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Primary Agents**: Temperature fluctuation (differential expansion of quartz vs feldspar), frost action, unloading/pressure release, wind/water abrasion, plant root expansion.\n`;
    doc += `- **Climatic Optimum**: Dominates in **arid, semi-arid, and alpine/periglacial** environments where moisture is limited but temperature extremes are severe.\n`;
    doc += `- **Thermodynamic Role**: Mechanically reduces boulder size to sand and silt, exponentially multiplying the specific surface area exposed to chemical attack.\n\n`;
  } else if (c.term === 'Chemical Weathering') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Six Core Mechanisms**: Solution, Hydration, Hydrolysis, Carbonation, Oxidation, Reduction.\n`;
    doc += `- **Climatic Optimum**: Dominates in **warm, humid tropical and subtropical** climates where rainfall and biological respiration ($CO_2$) are abundant.\n`;
    doc += `- **Universal Catalyst**: Water is indispensable as a solvent, hydrating agent, and carrier of dissolved acids and oxygen.\n\n`;
  } else if (c.term === 'Exfoliation') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Mechanism (Pressure Release / Unloading)**: Deeply buried plutonic rocks (like granite batholiths) expand upward as overlying strata erode away, fracturing along parallel sheet joints.\n`;
    doc += `- **Onion-Skin Spalling**: Differential diurnal heating of rock surface vs interior causes outer concentric curved slabs to peel away.\n\n`;
  } else if (c.term === 'Frost Wedging') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Volumetric Expansion Constant**: Water expands by exactly **9.05% (roughly 9%)** as it transitions from liquid ($4^\circ C$) to ice ($0^\circ C$).\n`;
    doc += `- **Hydrostatic Force**: Freezing in confined fractures generates pressures exceeding **2,000 kg/cm² (200 MPa)**, far outstripping the tensile strength of any known rock.\n`;
    doc += `- **Talus / Scree Formation**: Angular rock debris shattered by frost wedging accumulates at the base of slopes as colluvium.\n\n`;
  } else if (c.term === 'Carbonation') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Reaction Chemistry**:\n`;
    doc += `  $$CO_2 + H_2O \\rightleftharpoons H_2CO_3$$\n`;
    doc += `  $$CaCO_3 + H_2CO_3 \\rightleftharpoons Ca(HCO_3)_2$$\n`;
    doc += `- **Soil Air Multiplier**: Soil air contains **$0.30\\%\\ CO_2$** (10 times higher than atmospheric $0.03\\%$), dramatically accelerating carbonic acid formation and limestone dissolution.\n`;
    doc += `- **Karst Topography**: Responsible for underground caves, sinkholes, and the leaching of calcium carbonates from topsoil.\n\n`;
  } else if (c.term === 'Hydration') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Classic Exam Transformations**:\n`;
    doc += `  * Anhydrite ($CaSO_4$) + $2H_2O$ &rarr; **Gypsum** ($CaSO_4 \\cdot 2H_2O$)\n`;
    doc += `  * Hematite ($Fe_2O_3$, Red) + $3H_2O$ &rarr; **Limonite** ($2Fe_2O_3 \\cdot 3H_2O$, Yellowish-Brown)\n`;
    doc += `  * Bauxite formation: Gibbsite ($Al_2O_3 \\cdot 3H_2O$)\n`;
    doc += `- **Physical Swelling**: Lattice expansion of 50-80% creates internal strain, predisposing minerals to physical crumbling.\n\n`;
  } else if (c.term === 'Oxidation') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Electron Transfer**: Involves loss of electrons; converts ferrous iron ($Fe^{2+}$) to ferric iron ($Fe^{3+}$).\n`;
    doc += `- **Visual Color Markers**: Produces vibrant reddish-brown, yellow, and orange soil pigments (hematite, goethite).\n`;
    doc += `- **Redox Benchmark**: Occurs under high redox potential ($E_h > +400\\text{ mV}$) in well-drained, well-aerated upland soils.\n\n`;
  } else if (c.term === 'Reduction') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Electron Transfer**: Involves gain of electrons; converts insoluble ferric iron ($Fe^{3+}$) to soluble, mobile ferrous iron ($Fe^{2+}$).\n`;
    doc += `- **Gleization & Color**: Produces characteristic bluish-grey, greenish-grey colors in submerged wetland soils (paddy fields, marshes).\n`;
    doc += `- **Redox Benchmark**: Occurs under low/negative redox potential ($E_h < -100\\text{ to } -300\\text{ mV}$) driven by anaerobic microbial respiration.\n\n`;
  } else if (c.term === 'Solution') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Simple Dissolution**: Dissociates mineral cations and anions into solution without altering their chemical identity.\n`;
    doc += `- **Solubility Scale**: Halite ($NaCl$, highest) > Gypsum ($CaSO_4 \\cdot 2H_2O$) > Calcite ($CaCO_3$) > Quartz ($SiO_2$, lowest).\n`;
    doc += `- **Pedogenic Role**: Initial step that removes highly soluble salts from the upper profile in leaching environments.\n\n`;
  } else if (c.term === 'Hydrolysis') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Chief Silicate Weathering Engine**: Water chemically dissociates into $H^+$ and $OH^-$; the tiny $H^+$ ion penetrates silicate crystal lattices and displaces large metal cations ($K^+, Na^+, Ca^{2+}, Mg^{2+}$).\n`;
    doc += `- **Orthoclase to Kaolinite Classic Reaction**:\n`;
    doc += `  $$2KAlSi_3O_8 + 2H_2CO_3 + 9H_2O \\rightarrow Al_2Si_2O_5(OH)_4 + 2K^+ + 2HCO_3^- + 4H_4SiO_4$$\n`;
    doc += `- **Result**: Complete collapse of primary feldspar framework and the synthesis of secondary **Kaolinite clay minerals**.\n\n`;
  }

  if (c.examTraps) {
    doc += `**Examiner Traps & PYQ Alerts:**\n`;
    doc += `${c.examTraps.trim()}\n\n`;
  }

  doc += `---\n\n`;
}

const targetFile = path.join(__dirname, '..', 'Notes', 'Audio_Briefs', '01C_weathering_processes_10_keywords.md');
fs.writeFileSync(targetFile, doc, 'utf8');
console.log(`Generated Weathering Processes Audio Brief at: ${targetFile} (${(doc.length / 1024).toFixed(1)} KB)`);
