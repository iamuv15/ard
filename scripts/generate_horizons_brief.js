const fs = require('fs');
const path = require('path');

const items = JSON.parse(fs.readFileSync('scratch_horizons.json', 'utf8'));

let doc = `# AUDIO REVISION MASTERCLASS: SOIL HORIZONS & PEDOGENIC PROCESSES (15 KEYWORDS)
### Target Examinations: ICAR-AIEEA / JRF, IBPS-AFO, State AO / AAO, NABARD Grade A, UPSC-Agriculture
### Module: Soil Fundamentals, Genesis & Weathering > Soil Horizons & Pedogenic Processes

> **DIRECTIVE FOR NOTEBOOKLM AUDIO OVERVIEW / PODCAST HOSTS:**
> - You are two distinguished Soil Science and Pedology professors delivering an authoritative, high-yield audio revision masterclass.
> - The student is listening to this audio while actively viewing the **"Soil Horizons & Pedogenic Processes"** subcategory on their platform screen.
> - **Follow-Along Rule**: Clearly announce each keyword by number and exact name in numerical order (Keywords 1 to 15) before diving into its explanation so the student can follow along seamlessly on their screen.
> - **Pedagogical Style**: Conversational, engaging, and intellectually rigorous. Use clear soil profile diagrams and environmental analogies, state exact horizon designations, climatic regimes, and chemical reactions, and call out the classic "examiner traps" and trick questions found in past competitive papers.
> - **Core Comparisons to Emphasize**:
>   * The Master Horizons Sequence: **O - A - E - B - C - R**.
>   * Solum ($A + E + B$ true genetic soil) vs Regolith ($A + E + B + C$ unconsolidated mantle above bedrock).
>   * O Horizon: Strictly organic ($>20\%$ Organic Carbon); **absent in cultivated arable mineral soils**; present in virgin forests and wetlands.
>   * Eluviation ($E$ horizon, washing out, exit, bleaching) vs Illuviation ($B$ horizon, washing into, accumulation, clay/sesquioxides).
>   * Podzolization (cold humid coniferous, accumulates silica in $E$, leaches $Fe/Al$ to $B$) vs Laterization (hot humid tropical, leaches silica, accumulates $Fe/Al$ sesquioxides in solum).
>   * Calcification ($CaCO_3$ precipitation, semi-arid, calcic horizon $Bk$) vs Decalcification.
>   * Gleization (anaerobic, waterlogged, microbial reduction of $Fe^{3+} \rightarrow Fe^{2+}$, bluish-grey gley horizon).
>   * Pedoturbation: Argilliturbation (churning in Vertisols black cotton soil due to swelling montmorillonite) vs Bioturbation (earthworms/termites).
>   * Sodification (Solonization): Accumulation of exchangeable $Na^+$ on clay complex ($ESP > 15\%$, $pH > 8.5$, clay dispersion).

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
  if (c.term === 'O Horizon') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Critical Arable Fact**: **Absent in cultivated / plowed agricultural soils** because tillage mixes organic matter into the top mineral layer.\n`;
    doc += `- **Sub-horizon Hierarchy**:\n`;
    doc += `  * **Oi (Fibric)**: Slightly decomposed plant litter; recognizable original plant tissue.\n`;
    doc += `  * **Oe (Hemic)**: Moderately decomposed organic matter intermediate in breakdown.\n`;
    doc += `  * **Oa (Sapric)**: Highly decomposed, dark amorphous organic material; unrecognizable tissues.\n\n`;
  } else if (c.term === 'A Horizon') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Topsoil / Surface Mineral Horizon**: Enriched in humified organic matter intimately bound to mineral sand/silt/clay.\n`;
    doc += `- **Melanization**: The darkening of the mineral surface soil by humified organic matter accumulation.\n`;
    doc += `- **Biological Zone**: Hosts the highest biological activity, microbial biomass, and dense crop root architecture.\n\n`;
  } else if (c.term === 'E Horizon') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Master Designation History**: Formerly designated as **A2 horizon** in older USDA soil survey classifications.\n`;
    doc += `- **Albic Character**: Light-colored or ashy-white due to the complete removal of dark organic matter and colored iron/aluminum coatings, leaving bare quartz and feldspar grains.\n`;
    doc += `- **Position**: Sits directly between the A horizon and the underlying illuvial B horizon.\n\n`;
  } else if (c.term === 'B Horizon') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Subsoil Master Layer**: Zone of illuviation (washing into) characterized by accumulation of materials eluviated from A and E.\n`;
    doc += `- **Key Diagnostic Subordinates**:\n`;
    doc += `  * **Bt**: Illuvial accumulation of silicate clay (Argillic horizon).\n`;
    doc += `  * **Bs**: Illuvial accumulation of sesquioxides and organic matter (Spodic horizon).\n`;
    doc += `  * **Bk**: Illuvial accumulation of calcium carbonate (Calcic horizon).\n`;
    doc += `  * **Bh**: Illuvial accumulation of humus.\n\n`;
  } else if (c.term === 'C Horizon') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Parent Material Mantle**: Unconsolidated geological material from which the solum formed (or different transported strata).\n`;
    doc += `- **Solum vs Regolith**: C horizon is **EXCLUDED** from the solum ($A + E + B$), but is a vital member of the **Regolith** ($A + E + B + C$).\n`;
    doc += `- **Biological Inactivity**: Minimal root penetration and biological activity compared to the solum.\n\n`;
  } else if (c.term === 'R Horizon') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Consolidated Bedrock**: Solid continuous rock mass (granite, basalt, sandstone, limestone, quartzite).\n`;
    doc += `- **Distinction**: Cannot be dug with a hand spade; requires heavy machinery or pneumatic fracturing.\n`;
    doc += `- **Excluded from Both**: Not part of the solum AND not part of the unconsolidated regolith.\n\n`;
  } else if (c.term === 'Eluviation') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Etymology & Mnemonic**: Derived from Latin *elovere* (to wash out). Remember: **E stands for Exit / Washing Out**.\n`;
    doc += `- **Percolation Driven**: Downward moving water carries clays, iron, and aluminum oxides downward out of the A and E horizons.\n\n`;
  } else if (c.term === 'Illuviation') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Etymology & Mnemonic**: Derived from Latin *illovere* (to wash in). Remember: **I stands for Into / Washing In**.\n`;
    doc += `- **Clay Skins (Argillans)**: Translocated clays precipitate onto the surfaces of soil peds and channel walls in the B horizon, forming diagnostic shiny clay skins.\n\n`;
  } else if (c.term === 'Humification') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **C:N Ratio Narrowing**: Raw plant residue with wide C:N ratio (e.g. straw 80:1) is biologically condensed by microbes into stable humus with a narrow C:N ratio of **10:1 to 12:1**.\n`;
    doc += `- **Humic Fractions**: Separated by acid/alkali solubility: **Fulvic Acid** (soluble in both acid and alkali), **Humic Acid** (soluble in alkali, precipitates in acid), and **Humin** (insoluble in both).\n\n`;
  } else if (c.term === 'Podzolization') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Climatic & Floristic Setting**: Cool, humid temperate climate under **acidic coniferous / pine forests**.\n`;
    doc += `- **Chemical Mechanism**: Acidic polyphenolic plant leachates chelate iron and aluminum, removing them from the E horizon and leaving a bleached, ash-gray **Silica ($\text{SiO}_2$)** residual layer.\n`;
    doc += `- **Spodosols**: Diagnostic process forming the Spodosol soil order with an albic E and spodic B horizon.\n\n`;
  } else if (c.term === 'Laterization') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Desilication Process**: Hot, humid tropical conditions with alternating wet and dry seasons cause intense chemical weathering that **dissolves and removes Silica ($\text{SiO}_2$)**.\n`;
    doc += `- **Sesquioxide Residue**: Iron ($\text{Fe}_2\text{O}_3$) and Aluminum ($\text{Al}_2\text{O}_3$) oxides residually accumulate, hardening irreversibly upon atmospheric exposure into brick-like laterite.\n`;
    doc += `- **Buchanan 1807**: Discovered and named in Malabar, Kerala by Francis Buchanan from the Latin *later* (brick).\n\n`;
  } else if (c.term === 'Calcification') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Precipitation Regime**: Sub-humid, semi-arid, and grassland steppes where evapotranspiration exceeds rainfall.\n`;
    doc += `- **Chemistry**: Leaching is insufficient to wash calcium carbonate out of the profile; $Ca(HCO_3)_2$ precipitates as insoluble $CaCO_3$ nodules (kankar) at the depth of average annual rainfall wetting.\n\n`;
  } else if (c.term === 'Gleization') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Anaerobic Reduction**: Saturated/waterlogged conditions deplete oxygen ($E_h < -100\text{ to } -300\text{ mV}$); facultative and obligate anaerobic microbes reduce ferric iron ($\text{Fe}^{3+}$) to soluble ferrous iron ($\text{Fe}^{2+}$).\n`;
    doc += `- **Color Marker**: Imparts a diagnostic dull bluish-grey, greenish-grey, or olive matrix with rusty reddish mottles along root channels (Gley / Bg horizon).\n\n`;
  } else if (c.term === 'Pedoturbation') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Argilliturbation in Vertisols**: Self-ploughing / churning of black cotton soils; swelling 2:1 montmorillonite clay expands during wet season and shrinks during dry season, creating deep cracks into which surface soil falls, resulting in inverted horizons and **gilgai microrelief**.\n`;
    doc += `- **Bioturbation**: Earthworms (ingest and cast up to 30 tons of soil per hectare annually), ants, termites, and rodents homogenizing profile horizons.\n\n`;
  } else if (c.term === 'Sodification') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Diagnostic Thresholds**: Exchangeable Sodium Percentage ($\text{ESP} > 15\%$), Sodium Adsorption Ratio ($\text{SAR} > 13$), and $\text{pH} > 8.5$ (frequently reaching $9.5 - 10.5$).\n`;
    doc += `- **Black Alkali Mechanism**: Excess $\text{Na}^+$ causes complete dispersion of clay colloids and dissolves dark organic matter, which rises by capillarity to form a greasy black surface crust (Solonetz).\n`;
    doc += `- **Chemical Reclamation**: Requires **Gypsum ($\text{CaSO}_4 \cdot 2\text{H}_2\text{O}$)** to displace exchangeable $\text{Na}^+$ with $\text{Ca}^{2+}$, followed by heavy flushing/leaching.\n\n`;
  }

  if (c.examTraps) {
    doc += `**Examiner Traps & PYQ Alerts:**\n`;
    doc += `${c.examTraps.trim()}\n\n`;
  }

  doc += `---\n\n`;
}

const targetFile = path.join(__dirname, '..', 'Notes', 'Audio_Briefs', '01D_soil_horizons_and_pedogenic_processes_15_keywords.md');
fs.writeFileSync(targetFile, doc, 'utf8');
console.log(`Generated Horizons & Pedogenic Processes Audio Brief at: ${targetFile} (${(doc.length / 1024).toFixed(1)} KB)`);
