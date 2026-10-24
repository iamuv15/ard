const fs = require('fs');
const path = require('path');

const items = JSON.parse(fs.readFileSync('scratch_texture_mechanical.json', 'utf8'));

const orderMap = {
  'Soil Texture': 1,
  'Sand': 2,
  'Silt': 3,
  'Clay': 4,
  'Coarse Sand': 5,
  'Soil Textural Triangle': 6,
  'Mechanical Analysis': 7,
  'Stokes\' Law': 8,
  'Bouyoucos Hydrometer Method': 9,
  'Sedimentation Velocity': 10
};

items.sort((a, b) => (orderMap[a.term] || 99) - (orderMap[b.term] || 99));

let doc = `# AUDIO REVISION MASTERCLASS: SOIL TEXTURE & MECHANICAL ANALYSIS (10 KEYWORDS)
### Target Examinations: ICAR-AIEEA / JRF, IBPS-AFO, State AO / AAO, NABARD Grade A, UPSC-Agriculture
### Module: Soil Physical Properties & Soil Physics > Soil Texture & Mechanical Analysis

> **DIRECTIVE FOR NOTEBOOKLM AUDIO OVERVIEW / PODCAST HOSTS:**
> - You are two distinguished Soil Physics and Agronomy professors delivering an authoritative, high-yield audio revision masterclass.
> - The student is listening to this audio while actively viewing the **"Soil Texture & Mechanical Analysis"** subcategory on their platform screen.
> - **Follow-Along Rule**: Clearly announce each keyword by number and exact name in numerical order (Keywords 1 to 10) before diving into its explanation so the student can follow along seamlessly on their screen.
> - **Pedagogical Style**: Conversational, engaging, and intellectually rigorous. Dynamic banter between two expert coaches. Use tactile analogies (gritty beach sand vs talcum powder feel of silt vs sticky molding clay), physical mechanics (Stokes' spheres falling through viscous water, the hydrometer bobbing in suspension), exact size thresholds, chemical reagents (Calgon, H2O2, HCl), and call out the classic "examiner traps" and trick questions found in past competitive papers.
> - **Core Comparisons & Themes to Emphasize**:
>   * **Soil Texture is a Permanent / Inherent Property**: It cannot be altered by normal agricultural tillage or management under field conditions (unlike Soil Structure, which is dynamic and easily destroyed or rebuilt).
>   * **The "Heavy" vs "Light" Soil Paradox**: "Heavy soils" (clays) and "Light soils" (sands) refer to **draft power required for plowing**, NOT bulk density or physical weight! In reality, Sandy soils are heavier by bulk density (~1.60 g/cc) than Clay soils (~1.10 g/cc).
>   * **Particle Size Boundaries (USDA vs ISSS)**:
>     - Clay: $< 0.002\\text{ mm}$ ($< 2\\text{ }\\mu\\text{m}$) in **BOTH** systems.
>     - Silt: $0.002 - 0.05\\text{ mm}$ in **USDA** vs $0.002 - 0.02\\text{ mm}$ in **ISSS (European/Atterberg)**.
>     - Coarse Sand: $0.2 - 2.0\\text{ mm}$ (ISSS) vs $0.5 - 1.0\\text{ mm}$ (USDA).
>   * **The Loam Soil Fallacy**: Loam does **NOT** contain equal 33% portions of sand, silt, and clay by weight! It means **equal expression of physical properties**. (e.g., 7-27% clay exerts equal physical influence to 40-50% sand because of clay's enormous surface area).
>   * **Mechanical Analysis Sequence**:
>     1. Destruction of Organic Matter using $30\\%\\text{ }H_2O_2$ (hydrogen peroxide).
>     2. Dissolution of Carbonates using dilute $0.1N\\text{ }HCl$.
>     3. Chemical Dispersion using **Sodium Hexametaphosphate [(NaPO3)6] / Calgon** to saturate exchange complex with $Na^+$ and maximize electrostatic repulsion.
>   * **Stokes' Law Mechanics**: Terminal velocity $v = \\frac{2gr^2(\\rho_p - \\rho_w)}{9\\eta}$. Settling velocity is directly proportional to the **square of particle radius ($r^2$)** or diameter ($d^2$).
>   * **Assumptions & Validity Limits of Stokes' Law**: Valid only between **$0.2\\text{ mm}$** and **$0.0002\\text{ mm}$** ($200\\text{ }\\mu\\text{m}$ to $0.2\\text{ }\\mu\\text{m}$). Particles $> 0.2\\text{ mm}$ generate turbulent wakes; particles $< 0.0002\\text{ mm}$ are kept in permanent suspension by **Brownian motion**. Clay particles are flaky/platy, not true spheres.
>   * **Bouyoucos Hydrometer Timing**:
>     - **40-second reading**: Sand has settled out; hydrometer reads suspended (Silt + Clay).
>     - **2-hour reading**: Silt has settled out; hydrometer reads suspended Clay only.
>     - Temperature correction: $\\pm 0.2\\text{ g/L}$ per $1^\\circ\\text{F}$ deviation from $68^\\circ\\text{F}$ (or $\\approx 0.36\\text{ g/L}$ per $1^\\circ\\text{C}$ from $20^\\circ\\text{C}$).
>   * **Soil Textural Triangle**: 12 USDA textural classes. Three axes. Sum of Sand + Silt + Clay must equal exactly 100%.

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

  // Inject tailored authoritative exam pointers
  if (c.term === 'Soil Texture') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Permanent Inherent Property**: Texture cannot be altered by normal cultivation, plowing, liming, or fertilizer application. Only extreme, non-agronomic events (massive sediment deposition by flash floods or deep trenching/inversion) can change field texture.\n`;
    doc += `- **The "Heavy" vs "Light" Soil Trap**:\n`;
    doc += `  * Clay soils are termed **"Heavy Soils"** because of high cohesive resistance and massive draft power needed for plowing, NOT because of high bulk density.\n`;
    doc += `  * Sandy soils are termed **"Light Soils"** because they are easily tilled with low draft power, despite having a HIGHER bulk density (~1.60 g/cc) than clays (~1.10 g/cc).\n`;
    doc += `- **Agricultural Significance**: Governs fundamental soil physical behaviors including water holding capacity (WHC), infiltration rate, cation exchange capacity (CEC), aeration, and thermal conductivity.\n\n`;
  } else if (c.term === 'Sand') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Mineralogical Composition**: Dominated by primary mineral **Quartz ($SiO_2$)**, which is at the top of Goldich's stability series and highly resistant to chemical dissolution.\n`;
    doc += `- **Tactile & Physical Nature**: Gritty feel between fingers, visible to the unaided naked eye ($> 0.05\\text{ mm}$), non-plastic, non-cohesive, non-sticky.\n`;
    doc += `- **Pore Geometry**: Low total porosity ($35-50\\%$) dominated almost exclusively by **macropores (non-capillary pores > 0.05 mm)**, leading to rapid drainage, high aeration, and low capillary water retention.\n`;
    doc += `- **Specific Surface Area**: Extremely small, typically $< 0.1\\text{ m}^2/\\text{g}$ to $1\\text{ m}^2/\\text{g}$, resulting in virtually zero chemical adsorption or CEC ($< 1-5\\text{ cmol}(+)/\\text{kg}$).\n\n`;
  } else if (c.term === 'Silt') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Tactile & Visual Distinction**: Feels smooth, silky, and flour-like when dry; slippery like talcum powder when moist, but lacks the stickiness or plasticity of clay.\n`;
    doc += `- **Upper Limit Distinction (High-Yield PYQ)**:\n`;
    doc += `  * **USDA Upper Boundary**: $0.05\\text{ mm}$ ($50\\text{ }\\mu\\text{m}$).\n`;
    doc += `  * **ISSS Upper Boundary**: $0.02\\text{ mm}$ ($20\\text{ }\\mu\\text{m}$).\n`;
    doc += `  * **Universal Lower Boundary**: Identically **$0.002\\text{ mm}$** ($2\\text{ }\\mu\\text{m}$) across both systems.\n`;
    doc += `- **Plant Available Water Capacity (AWC)**: Medium-textured soils dominated by silt (especially **Silt Loam**) exhibit the highest available water holding capacity of all textural classes.\n`;
    doc += `- **Agronomic Hazards**: Highly prone to water erosion, detachment, surface crusting (pore sealing under raindrop impact), and frost heaving due to rapid capillary water transport.\n\n`;
  } else if (c.term === 'Clay') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Threshold Boundary**: Particles smaller than **$0.002\\text{ mm}$** ($< 2\\text{ }\\mu\\text{m}$). The colloidal fraction comprises particles $< 1\\text{ }\\mu\\text{m}$.\n`;
    doc += `- **Mineralogical & Surface Dynamics**: Dominated by secondary aluminosilicate layer clays (kaolinite, illite, montmorillonite) and sesquioxides with colossal specific surface area ($10\\text{ m}^2/\\text{g}$ for Kaolinite up to $800\\text{ m}^2/\\text{g}$ for Montmorillonite).\n`;
    doc += `- **Plasticity Rule**: A soil must contain a minimum of **$15\\%\\text{ Clay}$** to exhibit plastic behavior (ability to be molded without rupturing).\n`;
    doc += `- **Bulk Density vs Total Porosity**:\n`;
    doc += `  * Clay soils have the **lowest bulk density** (~$1.10 - 1.25\\text{ g/cm}^3$) because of high total pore space ($50-60\\%$).\n`;
    doc += `  * Dominated by **micropores (capillary pores < 0.05 mm)**, leading to high water retention but slow drainage and poor aeration under saturated conditions.\n\n`;
  } else if (c.term === 'Coarse Sand') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Size Demarcation**:\n`;
    doc += `  * **USDA**: $1.0 - 0.5\\text{ mm}$ (with Very Coarse Sand at $2.0 - 1.0\\text{ mm}$).\n`;
    doc += `  * **ISSS**: $2.0 - 0.2\\text{ mm}$ (broad category including USDA coarse and medium sand).\n`;
    doc += `- **Functional Role**: Functions as the rigid physical skeleton of soils; maximizes macro-pore connectivity and aeration at the expense of moisture retention.\n`;
    doc += `- **Leaching Hazard**: Excessive coarse sand leads to droughtiness and rapid downward leaching of mobile anions ($NO_3^-, SO_4^{2-}$) and potassium.\n\n`;
  } else if (c.term === 'Soil Textural Triangle') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **12 USDA Textural Classes**: Sand, Loamy Sand, Sandy Loam, Loam, Silt Loam, Silt, Sandy Clay Loam, Clay Loam, Silty Clay Loam, Sandy Clay, Silty Clay, Clay.\n`;
    doc += `- **Mathematical Identity**: $\\%\\text{ Sand} + \\%\\text{ Silt} + \\%\\text{ Clay} = 100\\%$. If two percentages are known, the third is mathematically fixed.\n`;
    doc += `- **Directional Reading Rules**:\n`;
    doc += `  * **Clay Axis**: Horizontal lines running parallel to the base (from left side upwards, 0 to 100%).\n`;
    doc += `  * **Silt Axis**: Sloping downward-left lines (from right side downwards, 0 to 100%).\n`;
    doc += `  * **Sand Axis**: Sloping upward-left lines (from bottom right to left, 0 to 100%).\n`;
    doc += `- **Loam Soil Composition (Classic Exam Trap)**: Loam soil typically contains $7-27\\%$ clay, $28-50\\%$ silt, and $23-52\\%$ sand. It does NOT contain equal parts by weight!\n\n`;
  } else if (c.term === 'Mechanical Analysis') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Pre-treatment Reagents (Know these by chemical name & formula)**:\n`;
    doc += `  * **Organic Matter**: Oxidized and removed with **$30\\%\\text{ Hydrogen Peroxide } (H_2O_2)$** on a hot water bath.\n`;
    doc += `  * **Carbonates ($CaCO_3$)**: Dissolved using dilute **$0.1N\\text{ }HCl$** (prevents calcium from causing flocculation).\n`;
    doc += `  * **Iron & Aluminum Sesquioxides**: Removed using the **Sodium Dithionite-Citrate-Bicarbonate (DCB) method**.\n`;
    doc += `- **The Dispersing Agent**: **Sodium Hexametaphosphate $[(NaPO_3)_6]$**, commercially branded as **Calgon**. $Na^+$ replaces divalent $Ca^{2+}$ and $Mg^{2+}$, swelling the diffuse double layer and dispersing clay particles into individual units.\n`;
    doc += `- **Methods of Separation**:\n`;
    doc += `  * Sieve analysis for Sand fraction ($> 0.05\\text{ mm}$).\n`;
    doc += `  * Pipette Method (Standard international research reference method; most accurate).\n`;
    doc += `  * Hydrometer Method (Bouyoucos method; rapid routine agronomic analysis).\n\n`;
  } else if (c.term === 'Stokes\' Law') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Mathematical Formula**: \n`;
    doc += `  $$v = \\frac{2gr^2(\\rho_p - \\rho_w)}{9\\eta} = \\frac{gd^2(\\rho_p - \\rho_w)}{18\\eta}$$\n`;
    doc += `  * $v$: Terminal settling velocity (cm/sec).\n`;
    doc += `  * $g$: Acceleration due to gravity ($980\\text{ cm/s}^2$).\n`;
    doc += `  * $r$: Radius of particle (cm); $d$: diameter.\n`;
    doc += `  * $\\rho_p$: Particle density ($2.65\\text{ g/cm}^3$ for standard mineral soils).\n`;
    doc += `  * $\\rho_w$: Density of liquid/water ($1.0\\text{ g/cm}^3$ at $4^\\circ\\text{C}$ or $0.998\\text{ g/cm}^3$ at $20^\\circ\\text{C}$).\n`;
    doc += `  * $\\eta$: Dynamic viscosity of water ($0.01005\\text{ poise}$ or $\\text{g}/(\\text{cm}\\cdot\\text{s})$ at $20^\\circ\\text{C}$).\n`;
    doc += `- **Core Proportionality**: Velocity is directly proportional to the **square of the particle radius or diameter ($v \\propto r^2 \\propto d^2$)**.\n`;
    doc += `- **Four Vital Assumptions & Practical Limitations (Top PYQ topic)**:\n`;
    doc += `  1. **Spherical Shape**: Assumes all particles are rigid, smooth spheres. In reality, clay particles are platy, plate-like, and disc-shaped; hence Stokes' law calculates the *Equivalent Spherical Diameter (ESD)*.\n`;
    doc += `  2. **Uniform Density**: Assumes every particle has $\\rho_p = 2.65\\text{ g/cm}^3$. In reality, heavy minerals (magnetite) settle faster, organic fragments settle slower.\n`;
    doc += `  3. **Laminar, Unhindered Flow**: Suspension must be dilute ($< 2-5\\%$ solids) so particles settle independently without collision or turbulence ($Re < 0.1$).\n`;
    doc += `  4. **Validity Size Range**: Strictly valid only between **$0.2\\text{ mm}$** and **$0.0002\\text{ mm}$** ($200\\text{ }\\mu\\text{m}$ to $0.2\\text{ }\\mu\\text{m}$).\n`;
    doc += `     * $> 0.2\\text{ mm}$: Creates turbulent eddies; falls slower than Stokes' prediction.\n`;
    doc += `     * $< 0.0002\\text{ mm}$ ($0.2\\text{ }\\mu\\text{m}$): Brownian motion (thermal bombardment by water molecules) exceeds gravitational force, preventing settling.\n\n`;
  } else if (c.term === 'Bouyoucos Hydrometer Method') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Pioneer & Calibration**: Developed by Dr. George Bouyoucos. Calibrated in grams of soil solids per liter of suspension at a standard temperature of **$68^\\circ\\text{F}$ ($20^\\circ\\text{C}$)**.\n`;
    doc += `- **The 40-Second Reading ($R_{40s}$)**:\n`;
    doc += `  * By 40 seconds, all sand particles ($> 0.05\\text{ mm}$) have settled past the 10 cm measuring zone.\n`;
    doc += `  * The reading represents suspended **(Silt + Clay)**.\n`;
    doc += `  * $\\%\\text{ Sand} = 100 - \\left[\\frac{R_{40s\\text{, corrected}}}{\\text{Sample Weight}} \\times 100\\right]$.\n`;
    doc += `- **The 2-Hour Reading ($R_{2hr}$)**:\n`;
    doc += `  * By 2 hours, all silt particles have settled out.\n`;
    doc += `  * The reading represents suspended **Clay ($< 0.002\\text{ mm}$)** only.\n`;
    doc += `  * $\\%\\text{ Clay} = \\left[\\frac{R_{2hr\\text{, corrected}}}{\\text{Sample Weight}} \\times 100\\right]$.\n`;
    doc += `  * $\\%\\text{ Silt} = 100 - (\\%\\text{ Sand} + \\%\\text{ Clay})$.\n`;
    doc += `- **Temperature Corrections**:\n`;
    doc += `  * For each degree Fahrenheit above $68^\\circ\\text{F}$, **add $0.2\\text{ g/L}$** (higher temperature lowers water viscosity, making particles settle too fast).\n`;
    doc += `  * For each degree Fahrenheit below $68^\\circ\\text{F}$, **subtract $0.2\\text{ g/L}$**.\n`;
    doc += `  * In Celsius: Add/subtract **$0.36\\text{ g/L}$ per $1^\\circ\\text{C}$** deviation from $20^\\circ\\text{C}$.\n\n`;
  } else if (c.term === 'Sedimentation Velocity') {
    doc += `**Authoritative Exam Pointers:**\n`;
    doc += `- **Terminal Equilibrium**: Reached when downward gravitational force ($F_g - F_{\\text{buoyancy}}$) exactly equals upward viscous friction drag ($F_d = 6\\pi \\eta r v$). Net acceleration becomes zero.\n`;
    doc += `- **Comparative Settling Rates through a 10 cm Liquid Column**:\n`;
    doc += `  * Coarse Sand ($2.0\\text{ mm}$): Settles in $< 1\\text{ second}$.\n`;
    doc += `  * Fine Sand ($0.2\\text{ mm}$): Settles in $\\approx 4\\text{ seconds}$.\n`;
    doc += `  * Silt upper limit ($0.05\\text{ mm}$): Settles in $\\approx 40\\text{ seconds}$ (basis of the 40-sec hydrometer reading).\n`;
    doc += `  * Clay boundary ($0.002\\text{ mm}$): Settles in $\\approx 7\\text{ to }8\\text{ hours}$ through 10 cm (or ~2 hours to clear the hydrometer bulb center of gravity).\n`;
    doc += `- **Temperature Influence**: Viscosity of water decreases as temperature rises; therefore, sedimentation velocity **increases** with higher temperatures.\n\n`;
  }

  // Exam Traps from database
  if (c.examTraps) {
    doc += `**Examiner Traps & PYQ Alerts:**\n`;
    doc += `${c.examTraps.trim()}\n\n`;
  }

  doc += `---\n\n`;
}

// Write to Notes/Audio_Briefs/02A_soil_texture_and_mechanical_analysis_10_keywords.md
const outDir = path.join(__dirname, '..', 'Notes', 'Audio_Briefs');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}
const outPath = path.join(outDir, '02A_soil_texture_and_mechanical_analysis_10_keywords.md');
fs.writeFileSync(outPath, doc, 'utf8');
console.log('Successfully generated audio brief at:', outPath);
console.log('File size:', fs.statSync(outPath).size, 'bytes');
