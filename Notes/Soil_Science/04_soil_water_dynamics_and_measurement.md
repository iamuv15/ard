# Comprehensive Master Revision Notes: Soil Water Dynamics, Moisture Constants, Potential, Movement & Measurement

---

## 1. Soil Water Classification Framework

Soil water is categorized based on physical forces, biological availability to plants, and ecological utility. 

```
                          ┌─────────────────────────┐
                          │   TOTAL SOIL WATER      │
                          │        (Holard)         │
                          └────────────┬────────────┘
                                       │
            ┌──────────────────────────┴──────────────────────────┐
            ▼                                                     ▼
┌──────────────────────┐                              ┌──────────────────────┐
│ Physical Scheme      │                              │ Biological Scheme    │
├──────────────────────┤                              ├──────────────────────┤
│ 1. Gravitational     │                              │ 1. Super-available   │
│    (< 1/3 atm)       │                              │    (< 1/3 atm)       │
│ 2. Capillary         │                              │ 2. Available        │
│    (1/3 to 31 atm)   │                              │    (1/3 to 15 atm)   │
│ 3. Hygroscopic       │                              │ 3. Unavailable       │
│    (31 to 10,000 atm)│                              │    (15 to 10,000 atm) │
└──────────────────────┘                              └──────────────────────┘
```

### A. Physical Classification Scheme
1. **Gravitational Water (Superfluous Water):**
   * Occupies larger soil pores (macropores, $> 0.06\text{ mm}$ diameter).
   * Moves down freely under the force of gravity.
   * Held at a soil moisture tension of **$< 1/3\text{ atmosphere}$ ($< 0.33\text{ bar}$, $\text{pF} < 2.54$)**.
   * **Agronomic Utility:** Entirely unavailable to plants; its temporary presence causes anoxia in the root zone by displacing soil air.
2. **Capillary Water:**
   * Held in capillary pores (micropores, $0.002 - 0.06\text{ mm}$ diameter) around soil particles by surface tension forces.
   * Retained against gravitational pull.
   * Held between **$1/3\text{ atmosphere}$ ($0.33\text{ bar}$) and $31\text{ atmospheres}$ ($31\text{ bar}$)** ($\text{pF } 2.54 - 4.50$).
   * **Agronomic Utility:** Serves as the primary source of liquid water absorbed by plant roots.
3. **Hygroscopic Water:**
   * Water adsorbed tightly as a thin, non-liquid film on the surface of soil colloidal particles.
   * Moves primarily in the vapor phase.
   * Held with extreme tenacity between **$31\text{ atmospheres}$ and $10,000\text{ atmospheres}$** ($\text{pF } 4.50 - 7.00$).
   * **Agronomic Utility:** Completely unavailable to plants due to excessive suction forces.

---

### B. Biological Classification Scheme
1. **Available Water (Chresard):**
   * The portion of soil water retained between the **Field Capacity ($1/3\text{ atm}$)** and the **Permanent Wilting Point ($15\text{ atm}$)** **[APSC ADO 2019]**.
   * Calculated mathematically as:
     $$\text{Available Water (\%)} = \text{Field Capacity (\%)} - \text{Permanent Wilting Point (\%)} \quad \mathbf{[RRB\ SO\ 2018]}$$
2. **Unavailable Water (Echard):**
   * Comprises the entire hygroscopic water fraction plus the portion of capillary water held below the wilting point ($> 15\text{ atm}$ up to $10,000\text{ atm}$). Includes unfrozen water held at high suction.
3. **Super-available or Superfluous Water:**
   * Water held at tensions **$< 1/3\text{ atm}$** (gravitational water + water in larger capillary interstices). Prolonged presence leads to root asphyxiation due to lack of oxygen.

---

### C. Ecological Water Terminology
* **Holard:** The total water content present in a given volume of soil.
* **Chresard:** The exact fraction of total soil water available for root uptake.
* **Echard:** The non-available fraction of soil water remaining bound to soil solids.

> 💡 **Exam Pointer:** 
> * **Holard** = **Chresard** + **Echard**
> * Water holding capacity follows the physical texturing order: **Clay > Silt > Sand** **[IBPS-AFO 2021]**.
> * Maximum Available Water Capacity ($\text{cm/cm}$ of soil) is highest in **Silt Loam / Loam** soils **[RRB SO 2018]**, because fine clay holds too much water at unavailable tensions ($> 15\text{ atm}$).

---

## 2. Soil Moisture Constants, Tension & pF Scale

Soil moisture constants represent specific reference equilibrium points on the soil-water tension spectrum.

```
       pF 0     pF 2.54           pF 4.20    pF 4.50                 pF 7.00
Suction: 0 atm   1/3 atm           15 atm     31 atm                10,000 atm
         ├─── Gravitational ───┼────── Capillary ───────┼────── Hygroscopic ──────┤
         │                     │<── Available Water ───>│                         │
         ▼                     ▼                        ▼                         ▼
    SATURATION          FIELD CAPACITY                PWP             HYGROSCOPIC COEFFICIENT
```

### Key Moisture Reference Points

1. **Saturation Point:**
   * All pore spaces (100%) are filled with water; air volume is zero.
   * Free energy of water at saturation is **zero**. Soil suction is **0 atm ($\text{pF } 0$)**.

2. **Field Capacity (FC):**
   * Reached 24–72 hours after heavy irrigation/rainfall when all macropores have drained under gravity.
   * Micro-pores remain filled with water, and air occupies macro-pores (approx. 25% water, 25% air, 50% solids by volume).
   * Held at a matric tension of **$0.1\text{ to } 0.33\text{ atm}$ ($1/3\text{ bar}$)** **[NABARD Grade A]** ($\text{pF } 2.54$).

3. **Moisture Equivalent:**
   * The percentage of water retained by a $1\text{ cm}$ thick layer of saturated soil subjected to a centrifugal force of **1,000 times gravity ($1000 \times g$)** for 40 minutes.
   * Tension ranges between **$1/3\text{ to } 1\text{ atm}$ ($\text{pF } 2.70 - 3.00$).

4. **Sticky Point:**
   * The moisture content at which dry soil, when mixed with water, just begins to stick to a clean metallic blade.
   * Tension is approximately **$1/3\text{ atm}$ ($\text{pF } 2.54$).

5. **Permanent Wilting Point (PWP) / Wilting Coefficient:**
   * The moisture content at which plants wilt and cannot recover turgidity even when placed in a saturated atmosphere.
   * Introduced by Briggs and Shantz (1912). Held at a suction tension of **$15\text{ atm}$ ($15\text{ bar}$)** **[APSC ADO 2019]**, **[IBPS-AFO 2020]** ($\text{pF } 4.20$).

6. **Ultimate Wilting Point (UWP):**
   * The moisture content at which complete wilting occurs, leading to plant tissue death.
   * Tensions reach **$60\text{ atmospheres}$ ($\text{pF } 4.80$).

7. **Hygroscopic Coefficient:**
   * The maximum amount of water vapor absorbed by 100 grams of dry soil placed in a saturated atmosphere (50% relative humidity at $15^\circ\text{C}$).
   * Held at a tension of **$31\text{ atmospheres}$** **[IBPS-AFO 2020]**, **[RRB SO 2021]** ($\text{pF } 4.50$).

---

### Master Soil Moisture Reference Table

| Moisture Class / Constant | Tension (atm / bar) | Suction Pressure ($\text{cm of } \text{H}_2\text{O}$) | pF Value | Availability / Physical State |
| :--- | :--- | :--- | :--- | :--- |
| **Saturation Point** | $0$ | $0 - 1$ | $0$ | Complete saturation (100% pore space filled) |
| **Gravitational Water** | $< 1/3$ ($< 0.33$) | $< 346$ | $< 2.54$ | Superfluous / Drainable water |
| **Field Capacity (FC)** | $1/3$ ($0.33$) | $346$ | $2.54$ | Upper limit of plant available water **[NABARD Grade A]** |
| **Sticky Point** | $\approx 1/3$ | $\approx 346$ | $2.54$ | Physical stickiness threshold |
| **Moisture Equivalent** | $1/3\text{ to } 1$ | $346 - 1,000$ | $2.70 - 3.00$ | Centrifugal equilibrium ($1000 \times g$) |
| **Wilting Point (PWP)** | $15$ | $15,849$ | $4.20$ | Lower limit of plant available water **[APSC ADO 2019]** |
| **Capillary Water Range** | $1/3\text{ to } 31$ | $346 - 31,622$ | $2.54 - 4.50$ | Held in micropores by surface tension |
| **Hygroscopic Coefficient**| $31$ | $31,622$ | $4.50$ | Absorbed from vapor at 50% RH **[IBPS-AFO 2020]** |
| **Hygroscopic Water Range**| $31\text{ to } 10,000$ | $31,622 - 10,000,000$| $4.50 - 7.00$ | Non-liquid vapor film bound to colloids |
| **Oven Dry Soil** | $10,000$ | $10,000,000$ | $7.00$ | Dried at $105^\circ\text{C} - 110^\circ\text{C}$ **[IARI 2013]** |

---

### The pF Concept
* Concept devised by **Schofield (1935)** to express soil moisture tension on a logarithmic scale.
* Defined as the logarithm (base 10) of the height of a water column in centimeters corresponding to the soil moisture suction force:
  $$\text{pF} = \log_{10} h$$
  *(where $h$ is the pressure head expressed in $\text{cm}$ of a water column).*
  * *Example:* $1\text{ atm} \approx 1,033\text{ cm of H}_2\text{O} \approx 10^3\text{ cm} \implies \text{pF} \approx 3.0$.
  * Field capacity ($1/3\text{ atm} \approx 346\text{ cm}$) $\implies \log_{10}(346) = \mathbf{2.54}$.
  * Wilting point ($15\text{ atm} \approx 15,849\text{ cm}$) $\implies \log_{10}(15849) = \mathbf{4.20}$.

> ⚠️ **Common Trap:** Do not confuse **Atmospheres / Bars** with **pF Values**. While tension decreases numerically as water is added, the pF value drops linearly on a logarithmic scale. A suction pressure of $15\text{ bar}$ equals $\text{pF } 4.20$, NOT $\text{pF } 15$.

---

## 3. Retention & Dynamics of Soil Water Movement

### Water Retention Forces
Soil particles attract and hold water molecules via two distinct physical forces **[IBPS-AFO 2015]**:
1. **Adhesion:** The force of molecular attraction operating between *dissimilar* substances (e.g., solid soil surfaces and dipolar water molecules). Responsible for the initial thin film adsorption.
2. **Cohesion:** The force of molecular attraction operating between *similar* substances (e.g., liquid water molecules attracting other water molecules via hydrogen bonds). Responsible for thick capillary water films.

---

### Water Movement & Entry Terminology

```
   Rainfall / Irrigation Water
               │
               ▼  [Surface Entry]
       ┌───────────────┐
       │ Infiltration  │ (Unsaturated flow at soil surface) [Agri MPSC 2018]
       └───────┬───────┘
               │
               ▼  [Internal Downward Transport]
       ┌───────────────┐
       │  Percolation  │ (Saturated flow through soil profile) [IBPS-AFO 2016]
       └───────┬───────┘
               │
               ├─────────────────────────┐
               ▼                         ▼
       ┌───────────────┐         ┌───────────────┐
       │   Leaching    │         │ Ground Water  │
       │ (Nutrients out│         │   Recharge    │
       │   of roots)   │         └───────────────┘
       └───────────────┘
```

1. **Infiltration:**
   * The entry of water into the soil through the upper surface **[Agri MPSC 2018]**.
   * Occurs primarily under **unsaturated conditions**.
   * Influenced by surface conditions: enhanced by organic matter, surface mulch, coarse/granular structure, and dry soil state; reduced by compaction or surface crusting.

2. **Percolation:**
   * The downward movement of water through a soil column/profile **[IBPS-AFO 2016]**, **[IBPS-AFO 2017]**.
   * Occurs predominantly under **saturated conditions** through macropores.
   * Primary mechanism for groundwater recharge; also drives **leaching** (the removal of soluble nutrients down beyond the root zone).
   * Coarse sandy soils have far higher percolation rates than fine clay soils.

3. **Permeability:**
   * The qualitative capacity of the soil matrix to transmit water and air through its pore system.

4. **Seepage:**
   * The horizontal or lateral flow of water through soil channels, canal banks, or subterranean layers. Primary cause of water conveyance losses in unlined irrigation channels.

5. **Drainage:**
   * The rate and ease with which excess (gravitational) water is removed from saturated soil, restoring aerobic conditions in the root zone.

6. **Hysteresis:**
   * The phenomenon where the relationship between soil moisture content and soil matric suction depends on whether the soil is being **wetted** or **dried**.
   * At any given suction tension, a drying soil retains **more water** than a wetting soil.

---

## 4. Soil Moisture Measurement Techniques

Accurate measurement of soil water content or matric potential is essential for effective irrigation scheduling.

### Summary of Soil Moisture Measurement Methods

| Method | Measurement Principle | Operational Range / Key Attributes | Exam Tags / Benchmarks |
| :--- | :--- | :--- | :--- |
| **Gravimetric Method** | Direct mass difference; dry sample in oven at $105^\circ\text{C}-110^\circ\text{C}$ until constant weight | Standard primary laboratory reference method; destructive and slow | **[IARI 2013]** |
| **Electrical Resistance (Gypsum Blocks)** | Resistance between embedded electrodes inside porous gypsum; changes with water content | Works best at dry ranges ($0.5\text{ to } 15\text{ bar}$); unreliable in highly saline soils | Standard Physical Method |
| **Tensiometer (Irrometer)** | Direct suction measurement via porous ceramic cup connected to a vacuum gauge | Measures matric potential directly from **$0\text{ to } 0.85\text{ bar}$ ($0 - 0.85\text{ atm}$)**; best for sandy and high-frequency irrigated soils | **[IBPS-AFO 2021]** |
| **Neutron Moisture Meter** | Thermalization of fast neutrons scattered by hydrogen nuclei ($\text{H}^+$ in $\text{H}_2\text{O}$) | Non-destructive, field-scale depth measurement; costly with radiation hazards | Advanced Field Method |
| **TDR (Time Domain Reflectometry)** | Direct measurement of soil dielectric constant | Fast, accurate, measures volumetric water content without calibration per soil | Modern Standard |

> 💡 **Exam Pointer:**
> * **Tensiometer** breaks vacuum and becomes non-functional at tensions exceeding **$0.85\text{ bar}$**. Therefore, it cannot measure water availability near the permanent wilting point ($15\text{ bar}$).
> * In light/sandy soils, depleting water up to a suction pressure of **$1.5\text{ bar}$** removes up to **98%** of total plant-available water **[RRB SO 2018]**.

---

## 5. Assessment of Irrigation Water Quality

Irrigation water quality affects crop yield, soil permeability, and soil physical structure. Key diagnostic parameters include salinity, sodicity, residual carbonate, and toxic trace elements.

### A. Salinity Hazard (Electrical Conductivity - $EC_w$)
Salinity hazard is determined by measuring Electrical Conductivity ($EC$), expressed in $\text{dS m}^{-1}$ or $\text{mmhos/cm}$.

```
  C1: Low        C2: Medium        C3: High          C4: Very High
[0 ────────── 0.25 ─────────── 0.75 ─────────── 2.25 ──────────── 5.0 dS/m]
```

* **$C_1$ (Low Salinity, $0 - 0.25\text{ dS m}^{-1}$):** Safe for almost all crops on all soils.
* **$C_2$ (Medium Salinity, $0.25 - 0.75\text{ dS m}^{-1}$):** Can be used with moderate leaching.
* **$C_3$ (High Salinity, $0.75 - 2.25\text{ dS m}^{-1}$):** Requires specific salinity management and good drainage.
* **$C_4$ (Very High Salinity, $2.25 - 5.00\text{ dS m}^{-1}$):** Unsuitable for irrigation under normal conditions.

---

### B. Sodicity Hazard (Sodium Adsorption Ratio - SAR)
SAR quantifies the relative concentration of sodium ($\text{Na}^+$) relative to calcium ($\text{Ca}^{2+}$) and magnesium ($\text{Mg}^{2+}$) in soil or water, expressed in concentration units of $\text{me/L}$:

$$\mathbf{SAR = \frac{[\text{Na}^+]}{\sqrt{\frac{[\text{Ca}^{2+}] + [\text{Mg}^{2+}]}{2}}}}$$

#### SAR Classes & Alkalinity Hazards

| Class | Range | Hazard Description | Exam Tags |
| :--- | :--- | :--- | :--- |
| **$S_1$** | **$< 10$** | Low Sodium Hazard; safe for almost all soils | Standard Benchmark |
| **$S_2$** | **$10 - 18$** | Medium Sodium Hazard; appreciable hazard in fine textured soils | **[RRB SO 2018]** |
| **$S_3$** | **$18 - 26$** | High Sodium Hazard; requires gypsum addition and drainage | **[IBPS-AFO 2019]** |
| **$S_4$** | **$> 26$** | Very High Sodium Hazard; generally unsatisfactory for irrigation | Standard Benchmark |

---

### C. Residual Sodium Carbonate (RSC)
RSC measures the potential precipitation of calcium and magnesium carbonate, which increases the relative sodicity hazard. Calculated as:

$$\mathbf{RSC\ (\text{me/L}) = (\text{CO}_3^{2-} + \text{HCO}_3^-) - (\text{Ca}^{2+} + \text{Mg}^{2+})}$$

* **Safe Water:** $\text{RSC} < 1.25\text{ me/L}$
* **Marginal Water:** $\text{RSC} = 1.25 - 2.50\text{ me/L}$
* **Unsuitable Water:** $\text{RSC} > 2.50\text{ me/L}$

---

### D. Toxic Ions & Micronutrient Limits

1. **Boron Concentration Classes:**
   * **Sensitive Crops:** Critical threshold $< 0.33\text{ ppm}$; toxic above $1.25\text{ ppm}$.
   * **Semi-Tolerant Crops:** Tolerates $0.67 - 1.33\text{ ppm}$.
   * **Tolerant Crops:** Tolerates $2.0 - 3.0\text{ ppm}$; toxic above $3.75\text{ ppm}$.

2. **Chloride Content:**
   * $< 70\text{ ppm}$ ($< 2\text{ me/L}$): Safe for all crops.
   * $> 350\text{ ppm}$ ($> 10\text{ me/L}$): Severe foliar injury and burning.
   * **Crop Tolerance Spectrum:** 
     *(Low)* Dry Bean $<$ Onion $<$ Carrot $<$ Lettuce $<$ Maize $<$ Potato $<$ Alfalfa $<$ Wheat $<$ Barley *(High)*.

3. **Nitrate Ion Concentration:**
   * $< 5\text{ me/L}$: Safe.
   * $5 - 30\text{ me/L}$: Moderate problems.
   * $> 30\text{ me/L}$: Severe toxicity and excessive vegetative growth.

---

## 6. Soil Air Dynamics & Aeration Parameters

### Composition & Diffusion Mechanics
* Soil air supplies $O_2$ for root respiration and aerobic microbial metabolism while allowing toxic $CO_2$ to diffuse out.
* Ideal agricultural soil at field capacity contains **$2/3$ water and $1/3$ air** in its pore volume.
* **$CO_2$ Concentration:** Soil air contains approximately **10 times higher $CO_2$ concentration ($\approx 0.3\%$)** than the ambient atmosphere ($\approx 0.03 - 0.04\%$).
* **Diffusion Governing Law:** Gas movement through soil pores occurs primarily via molecular diffusion, governed by **Fick’s First Law**:
  $$J = -D \frac{dC}{dx}$$
  *(where $J$ is diffusion flux, $D$ is diffusion coefficient, and $dC/dx$ is concentration gradient).*

---

### Oxygen Diffusion Rate (ODR)
* **Definition:** The rate at which oxygen gas in the soil profile is replenished from the atmosphere. Measured using a platinum microelectrode.
* **ODR Dynamics:** Increases as soil moisture content decreases; decreases with increasing soil depth.
* **Critical Root Growth Limit:** Root growth and nutrient absorption cease completely when the ODR falls below **$20 \times 10^{-8}\text{ g/cm}^2/\text{min}$**.
* **Crop Specific Ranges:** Typical operational range is $22.9\text{ to } 39.5 \times 10^{-8}\text{ g/cm}^2/\text{min}$.
  * **Highest ODR Requirement:** Irrigated Pea ($\approx 39.5 \times 10^{-8}\text{ g/cm}^2/\text{min}$).
  * **Lowest ODR Requirement:** Paddy/Rice ($\approx 22.1 \times 10^{-8}\text{ g/cm}^2/\text{min}$).

---

## 7. Soil Thermal Dynamics & Temperature

Heat transport in the soil profile directly regulates seed germination, microbial activity, and chemical reaction rates.

### Principles of Heat Transfer
1. **Primary Transport Mechanism:** Thermal energy moves through solid soil particles predominantly via **Conduction** **[MP Forest Service 2009]**.
2. **Governing Law:** Heat conduction through soil is described by **Fourier’s Law**:
  $$q = -k \frac{dT}{dx}$$
  *(where $q$ is heat flux, $k$ is thermal conductivity, and $dT/dx$ is thermal gradient).*

---

### Thermal Characteristics & Specific Heat
* **Specific Heat ($c$):** The quantity of heat required to raise the temperature of 1 gram of a substance by $1^\circ\text{C}$ ($\text{cal/g}^\circ\text{C}$).
  * **Water:** $1.00\text{ cal/g}^\circ\text{C}$
  * **Humus / Organic Matter:** $0.50\text{ cal/g}^\circ\text{C}$
  * **Dry Mineral Soil:** $0.20\text{ cal/g}^\circ\text{C}$
  * **Metallic Minerals (Iron oxides):** $0.10\text{ cal/g}^\circ\text{C}$ *(Lowest)*

```
[ Water: 1.0 cal/g ] > [ Humus: 0.5 cal/g ] > [ Dry Soil: 0.2 cal/g ] > [ Iron Minerals: 0.1 cal/g ]
```

* **Thermal Conductivity Order:** Solid mineral particles conduct heat much faster than water or air:
  $$\mathbf{\text{Sand} > \text{Loam} > \text{Clay}}$$
  * Compacted soils have higher thermal conductivity than loose soils.
  * Moist soil transfers heat roughly **150 times faster** than dry, air-filled porous soil.

* **Latent Heat of Vaporization:** Evaporating water consumes $540\text{ kcal/kg}$ of heat energy, cooling the surface soil layer by $1^\circ\text{C} - 6^\circ\text{C}$ relative to sub-surface layers.
* **Thermal Stabilization:** Soil temperature remains relatively constant below a depth of **$80\text{ cm}$**.

---

## 8. Soil Fertility vs. Soil Productivity

```
┌─────────────────────────────────────────────────────────┐
│                    SOIL PRODUCTIVITY                    │
│  (Crop Yield Potential under Field Management Systems)   │
│  ┌───────────────────────────────────────────────────┐  │
│  │                  SOIL FERTILITY                   │  │
│  │  (Inherent Nutrient Supplying Capacity of Soil)   │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Core Distinction Matrix

| Parameter | Soil Fertility | Soil Productivity |
| :--- | :--- | :--- |
| **Definition** | Inherent capacity of soil to supply essential nutrients in available forms and balanced proportions **[UPCATET PG]**. | Ability of soil to produce a specific crop yield under a defined management system. |
| **Measurement Index** | Evaluated via soil testing, plant tissue analysis, and micro-biological bioassays. | Measured directly in terms of crop economic yield ($\text{q/ha}$ or $\text{t/ha}$). |
| **Dependency** | Depends primarily on physical, chemical, and biological properties of soil. | Depends on soil fertility + climate + location + irrigation + management practices. |
| **Universal Axiom** | **All productive soils are fertile, BUT all fertile soils are NOT necessarily productive.** | 

---

## 9. Major Soil Orders of India & Taxonomic Classification

The Indian Council of Agricultural Research (ICAR) classifies Indian soils using the USDA Soil Taxonomy framework.

### Distribution of USDA Soil Orders in India

| USDA Soil Order | Geographic / Taxonomic Characteristics | Percent Area in India | Exam Tags |
| :--- | :--- | :--- | :--- |
| **Inceptisols** | Weakly developed B horizons; embryonic soils spread across river basins | **$39.74\%$** *(Largest)* | **[APSC ADO 2019]** |
| **Entisols** | Recent alluvial/coastal soils lacking diagnostic subsurface horizons | **$28.08\%$** | Standard Benchmark |
| **Alfisols** | High base saturation, weathered illuvial clay-rich B horizons | **$13.55\%$** | Standard Benchmark |
| **Vertisols** | Dark expand-contract shrink-swell clay soils (smectite/montmorillonite rich) | **$8.52\%$** | **[RRB SO 2019]** |
| **Aridisols** | Arid/desert soils with low organic matter and calcic/gypsic horizons | **$4.28\%$** | Standard Benchmark |
| **Ultisols** | Highly leached acid forest/laterite soils with dominant Kaolinite clay | **$2.51\%$** | **[NABARD 2021]** |

---

## Previous Year Questions (PYQs) & Solved Rapid-Fire MCQs

### 1. Which forces are responsible for the retention of water on soil particle surfaces? **[IBPS-AFO 2015]**
(a) Cohesion only  
(b) Adhesion only  
(c) Both Cohesion and Adhesion  
(d) Radiation  
(e) Electrostatic repulsion  

> **Answer:** (c)  
> **Rationale:** Water is held on soil solid surfaces by **Adhesion** (attraction between solid surfaces and water molecules) and held to other water molecules by **Cohesion** (hydrogen bonding between water molecules).

---

### 2. Downward entry of water through the upper soil surface into unsaturated soil is termed as: **[Agri MPSC 2018]**
(a) Percolation  
(b) Infiltration  
(c) Seepage  
(d) Leaching  
(e) Drainage  

> **Answer:** (b)  
> **Rationale:** Infiltration is strictly defined as the entry of water *into* the soil at the surface under unsaturated conditions. Movement *through* internal soil layers is percolation.

---

### 3. The movement of water through a saturated soil column down toward deeper horizons is known as: **[IBPS-AFO 2016, 2017]**
(a) Infiltration  
(b) Percolation  
(c) Seepage  
(d) Hysteresis  
(e) Absorption  

> **Answer:** (b)  
> **Rationale:** Percolation describes the flow of water *through* saturated soil horizons, serving as the main mechanism for groundwater recharge.

---

### 4. What is the tension of water held at the Hygroscopic Coefficient stage? **[IBPS-AFO 2020]**
(a) $0.33\text{ atm}$  
(b) $15\text{ atm}$  
(c) $31\text{ atm}$  
(d) $10,000\text{ atm}$  
(e) $0.10\text{ atm}$  

> **Answer:** (c)  
> **Rationale:** At the hygroscopic coefficient stage, soil water is bound to colloid surfaces at a suction tension of **$31\text{ atm}$** ($\text{pF } 4.50$).

---

### 5. Arrange the following soil textural classes in decreasing order of overall Water Holding Capacity: **[IBPS-AFO 2021]**
(a) Clay > Silt > Sand  
(b) Sand > Silt > Clay  
(c) Silt > Sand > Clay  
(d) Clay > Sand > Silt  
(e) Silt > Clay > Sand  

> **Answer:** (a)  
> **Rationale:** Finer texture particles offer greater total pore space and surface area. Thus, total water holding capacity follows: **Clay > Silt > Sand**.

---

### 6. Which soil textural class exhibits the maximum Available Water Capacity ($\text{cm/cm}$ of soil)? **[RRB SO 2018]**
(a) Sandy Loam  
(b) Silt Loam / Loam  
(c) Heavy Clay  
(d) Loamy Sand  
(e) Sandy Clay Loam  

> **Answer:** (b)  
> **Rationale:** Although clay holds more *total* water, a large portion is bound below the wilting point ($>15\text{ atm}$). **Silt Loam / Loam** soils maximize the difference between Field Capacity ($1/3\text{ atm}$) and Permanent Wilting Point ($15\text{ atm}$), providing the highest *available* water.

---

### 7. Which instrument measures soil moisture suction directly in field conditions up to $0.85\text{ bar}$? **[IBPS-AFO 2021]**
(a) Tensiometer  
(b) Hygrometer  
(c) Anemometer  
(d) Pycnometer  
(e) Psychrometer  

> **Answer:** (a)  
> **Rationale:** Tensiometers measure matric tension directly through a porous ceramic cup, operating accurately between $0\text{ and } 0.85\text{ bar}$.

---

### 8. Which Sodium Adsorption Ratio (SAR) range corresponds to class $S_2$ (Medium Sodicity Hazard)? **[RRB SO 2018]**
(a)