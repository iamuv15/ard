import 'dotenv/config'
import prisma from '../src/lib/prisma'

async function consolidate() {
  console.log('🚀 Starting Concept Consolidation for Chapter 10 (Animal Husbandry)...')

  // =========================================================================
  // 1. GESTATION & PARTURITION MASTER CONSOLIDATION (Canonical ID: 1)
  // Consolidates: ID 1 (Gestation Period), ID 119 (Swine Gestation Period), ID 120 (Goat Gestation Period)
  // =========================================================================
  console.log('\n--- Consolidating Gestation & Parturition Cluster (ID 1, 119, 120) ---')

  const gestationDefinition = 
    'The comprehensive physiological duration of pregnancy spanning from conception to parturition across livestock species (Cattle, Buffalo, Sheep, Goat, Swine, Camel, Equine), including species-specific gestational timelines, endocrine regulation, pre-parturient management, and farrowing/kidding protocols.'

  const gestationContent = `### High-Yield Cross-Species Gestation & Parturition Matrix

| Livestock Species | Average Gestation (Days) | Normal Range | Common Metric / Rule | Parturition Term | Litter Size |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Buffalo** | **316 ± 5 days** | 305–320 days | ~10.5 months *(IBPS-AFO standard)* | Calving | 1 (Rare twins) |
| **Dairy Cattle (Cow)** | **280–285 days** | 278–290 days | ~9 months 9 days | Calving | 1 |
| **Sheep (Ovine)** | **145–150 days** | 142–152 days | ~5 months minus 5 days | Lambing | 1–2 |
| **Goat (Caprine)** | **150–152 days** | 148–156 days | ~5 months | Kidding | 1–3 (Twinning common) |
| **Swine (Pig)** | **114 days** | 112–115 days | **3 months, 3 weeks, 3 days** | Farrowing | 8–12 piglets |
| **Horse (Equine)** | **335–345 days** | 330–350 days | ~11 months | Foaling | 1 |
| **Camel (Dromedary)**| **390–410 days** | 365–410 days | ~13 months *(Rajasthan: 22–24d cycle)* | Calving | 1 |
| **Dog (Bitch)** | **60–63 days** | 58–65 days | ~2 months | Whelping | 4–8 |
| **Cat (Queen)** | **60–63 days** | 58–65 days | ~2 months | Queening | 3–6 |
| **Elephant** | **600–660 days** | 20–22 months | Longest gestation among land mammals | Calving | 1 |
| **Rabbit** | **30–32 days** | 28–34 days | ~1 month | Kindling | 6–10 |

---

### Swine Gestation & Farrowing Management
- **Mnemonic Rule of Thumb:** Swine gestation is exactly **114 days** (calculated as **3 months, 3 weeks, and 3 days**; biological range: 112–115 days).
- **Reproductive Cycle Parameters:**
  - Gilts attain puberty at **8–10 months** (240–300 days) when body weight reaches **100–120 kg**.
  - Polyestrous with an estrous cycle of **21 days** (range: 18–24 days).
  - Standing heat lasts **2–3 days** (48–72 hours), though outward vulvar edema and redness can persist for 5–7 days.
- **Service & Breeding Strategy:**
  - Sows and gilts must be bred twice: **2 services spaced 12 to 14 hours apart** during standing heat to maximize fertilization and litter size.
  - Normal boar-to-sow mating ratio is **1:10 to 1:15** in pasture systems or **1:20 to 1:25** in hand-mating systems.
- **Pre-Farrowing Management Protocols:**
  - Deworm pregnant sows **2 to 3 weeks prior** to expected farrowing.
  - Transfer the sow to thoroughly scrubbed, disinfected farrowing pens fitted with guard rails/farrowing crates **10 to 14 days before farrowing** to acclimatize and prevent piglet crushing.
  - Normal litter size ranges between **8 to 12 piglets** per farrowing.
- **Neonatal Piglet Interventions:**
  - Provide a heated creep area maintained strictly at **32°C to 35°C** during the first week to prevent neonatal hypothermia.
  - Administer **Iron Dextran (100–200 mg IM)** on **Day 3** of life to combat nutritional microcytic hypochromic anemia (commonly termed **"Piglet Anemia" or "Thumps"**), as sow milk is inherently deficient in iron.
  - Clip the 8 sharp needle (canine) teeth within 24 hours of birth to prevent teat lacerations.

---

### Small Ruminants (Goat & Sheep) Gestation & Kidding Management
- **The Critical Goat vs. Sheep Exam Differentiator:**
  - **Goat Gestation:** Strictly **150 to 152 days** (averaging ~5 months).
  - **Sheep Gestation:** Slightly shorter at **145 to 150 days** (averaging ~147 days).
- **Reproductive Metrics & Intervals:**
  - Goats exhibit an average oestrous cycle of **20 days** (range: 19–21 days) with a heat period lasting **2 to 3 days (48 hours)**.
  - Sheep exhibit the shortest estrous cycle among farm ruminants: **16 to 17 days** (15–18 days) with heat lasting **24 to 36 hours**.
  - **Kidding Interval:** Under optimal commercial feeding and management (e.g., in prolific breeds like Barbari and Black Bengal), the inter-kidding period can be reduced to **8 months** (3 kiddings in 2 years) with high twinning and triplet percentages (60–80%).
- **Nutritional Flushing & Steaming-Up:**
  - **Flushing:** Providing extra energy/concentrates (250–350 g daily) **2 to 3 weeks prior to breeding** to increase ovulation rate and multiple births.
  - **Steaming-Up:** Increasing concentrate rations in the final **4 to 6 weeks of gestation** to support rapid fetal growth (70% of fetal growth occurs in the final trimester) and completely avert **Pregnancy Toxemia (Ketosis / Twin Lamb Disease)**.

---

### Large Ruminants (Cattle & Buffalo) Gestation & Calving
- **Buffalo vs. Cattle Variance:**
  - Buffalo gestation averages **316 ± 5 days** (spanning 305–320 days), which is approximately **1 month longer** than cattle (**280–285 days**).
- **Gestation Diagnosis Benchmarks (Per-Rectal Examination):**
  - **Day 30–35:** Asymmetry of uterine horns and positive fetal membrane slip.
  - **Day 45–60:** Amniotic vesicle palpation and palpable embryonic mass.
  - **Day 75–90:** Cotyledons (placentomes) palpable through the uterine wall (bean-sized).
  - **Day 120+:** Hypertrophy and distinct pulsation (**fremitus**) of the ipsilateral middle uterine artery within the broad ligament.
- **Dry Period Management:**
  - A mandatory dry period of **60 days** is essential prior to calving for mammary gland involution, epithelial regeneration, and maximal accumulation of immunoglobulin-rich colostrum.

---

### Endocrine Control of Gestation & Parturition Cascade
1. **Maintenance of Gestation:**
   - Dominated entirely by **Progesterone ($P_4$)**, synthesized by the functional Corpus Luteum (CL).
   - In **CL-dependent species** (Goats, Swine, and Cows for the first 200 days), the corpus luteum is indispensable throughout pregnancy; accidental luteolysis causes immediate abortion.
   - In **Placenta-supported species** (Sheep and Mares), placental progesterone synthesis takes over in mid-to-late gestation, rendering the CL dispensable.
2. **The Parturition Trigger Cascade:**
   - **Fetal Cortisol Surge:** Fetal stress and hypothalamic maturation trigger adrenocorticotropic hormone (ACTH) release → fetal adrenal cortex secretes cortisol.
   - **Steroid Enzyme Switch:** Fetal cortisol activates placental $17\\alpha$-hydroxylase, converting progesterone ($P_4$) into **Estrogen ($E_2$)**.
   - **Uterine PGF2α Release:** Elevated estrogens stimulate maternal endometrial synthesis of **Prostaglandin $F_{2\\alpha}$ ($PGF_{2\\alpha}$)**, which terminates any remaining luteal tissue and sensitizes the myometrium.
   - **Ferguson Reflex & Oxytocin:** Fetal head pressing into the dilated cervix sends neuroendocrine signals to the posterior pituitary to release **Oxytocin**, inducing powerful rhythmic myometrial contractions and expulsion.`

  const gestationTraps = `> [!WARNING]
> **Exam Trap & High-Yield Differentiation Rules:**
> 1. **Buffalo vs. Cattle Gestation:** IBPS-AFO and ICAR examinations standard for Buffalo gestation is strictly **316 ± 5 days** (~10.5 months). Never mark 280–285 days for buffaloes!
> 2. **Goat vs. Sheep Gestation:** Goats gestate for **150–152 days**, whereas sheep gestate for **145–150 days**. This subtle 2-to-5 day difference is a favorite examiner distractor.
> 3. **Swine 3-3-3 Rule:** Always remember **3 months + 3 weeks + 3 days = 114 days**. Close numerical distractors like 110 or 120 days frequently appear in competitive exams.
> 4. **Camel Gestation:** Camels carry fetuses for **390 to 410 days** (~13 months), NOT 310 days.
> 5. **Piglet Iron Injection:** Iron Dextran injection (100–200 mg) must be given on **Day 3** postpartum to prevent nutritional hypochromic microcytic anemia ("thumps").`

  const gestationRelatedTerms = [
    'Swine Gestation Period',
    'Goat Gestation Period',
    'Sheep Gestation Period',
    'Buffalo Gestation Period',
    'Farrowing',
    'Kidding',
    'Calving',
    'Lambing',
    'Parturition in Livestock',
    'Gestation Length',
    '3 Months 3 Weeks 3 Days',
    'Gestation Table',
    'Pregnancy Toxemia',
    'Inter-kidding Period',
    'Piglet Anemia'
  ]

  // Collect all questions from 1, 119, 120
  const qList1 = await prisma.question.findMany({
    where: { concepts: { some: { id: { in: [1, 119, 120] } } } },
    select: { id: true }
  })
  console.log(`Found ${qList1.length} total questions linked across Gestation concepts (1, 119, 120).`)

  // Update canonical Concept 1
  await prisma.chapterConcept.update({
    where: { id: 1 },
    data: {
      term: 'Gestation Period & Parturition',
      slug: 'gestation-period',
      category: 'Reproductive Physiology & Lifecycle Management',
      subCategory: 'Reproductive Metrics & Parameters',
      definition: gestationDefinition,
      content: gestationContent,
      examTraps: gestationTraps,
      relatedTerms: gestationRelatedTerms,
      questions: {
        connect: qList1.map(q => ({ id: q.id }))
      }
    }
  })
  console.log('✅ Concept 1 updated to "Gestation Period & Parturition" with all questions connected.')

  // Delete deprecated concepts 119, 120
  for (const depId of [119, 120]) {
    try {
      await prisma.chapterConcept.delete({ where: { id: depId } })
      console.log(`🗑️ Deleted deprecated concept ID ${depId}.`)
    } catch (e: any) {
      console.log(`Notice for concept ${depId}: ${e.message}`)
    }
  }

  // =========================================================================
  // 2. OESTROUS CYCLE & PHASES MASTER CONSOLIDATION (Canonical ID: 84)
  // Consolidates: ID 84 (Estrus Phase), ID 83 (Proestrum), ID 85 (Metoestrum), ID 86 (Diestrum), ID 94 (Estrous Cycle Duration)
  // =========================================================================
  console.log('\n--- Consolidating Estrous Cycle Cluster (ID 84, 83, 85, 86, 94) ---')

  const estrousDefinition =
    'The rhythmic, cyclic reproductive sequence in sexually mature, non-pregnant female mammals comprising four successive physiological phases (Proestrus, Estrus, Metestrus, Diestrus), orchestrated by the hypothalamic-pituitary-ovarian endocrine axis to coordinate follicular maturation, standing heat receptivity, spontaneous/induced ovulation, and luteal uterine preparation.'

  const estrousContent = `### High-Yield Cross-Species Estrous Cycle & Estrus Matrix

| Livestock Species | Estrous Cycle Length | Estrus Duration (Heat) | Ovulation Timing Relative to Estrus | Type of Estrous Cycle |
| :--- | :--- | :--- | :--- | :--- |
| **Cow (Bovine)** | **21 days** (18–24d) | **18 hours** (12–24h) | **10–14 hours AFTER end of estrus** *(Post-estrual)* | Polyestrous (Year-round) |
| **Buffalo** | **21 days** (19–22d) | **24 hours** (18–36h) | **11–15 hours after end of estrus** | Polyestrous (Silent heat in summer) |
| **Sheep (Ewe)** | **16–17 days** (14–19d) | **24–36 hours** (1–2 days) | **Late estrus** (near end of heat) | Seasonally Polyestrous (Short-day) |
| **Goat (Doe)** | **20–21 days** (19–22d) | **24–48 hours** (2–3 days) | **Late estrus / near end of heat** | Seasonally Polyestrous |
| **Swine (Sow)** | **21 days** (18–24d) | **48–72 hours** (2–3 days) | **Mid-to-late estrus** (~36–40 hours from onset) | Polyestrous (Year-round) |
| **Mare (Equine)** | **21–22 days** (19–26d) | **5–7 days** *(Longest)* | **24–48 hours BEFORE end of estrus** | Seasonally Polyestrous (Long-day) |
| **Camel** | **10–24 days** (Waves) | **3–5 days** | **Induced ovulator** (30–48h post-coitus) | Seasonal waves (Induced ovulator) |
| **Bitch (Canine)** | **6–7 months** (Monoestrous) | **9 days** (4–13 days) | **Day 2–3 of estrus** (Primary oocyte) | Monoestrous / Diestrous |

---

### Phase 1: Proestrus / Proestrum (Preparatory Follicular Phase)
- **Duration & Timing:** Lasts **2 to 3 days** (approx. Day 18 to Day 20 of a 21-day cycle).
- **Endocrine Drivers:** 
  - Rapid regression of the prior Corpus Luteum causes a steep decline in systemic **Progesterone ($P_4$)**.
  - Negative feedback on the hypothalamus is removed, triggering episodic release of **GnRH**, which stimulates anterior pituitary secretion of **FSH** (Follicle Stimulating Hormone) and pulsatile **LH** (Luteinizing Hormone).
- **Ovarian & Morphological Events:**
  - Rapid recruitment, selection, and development of the antral follicle into the mature, fluid-filled **Graafian Follicle**.
  - Follicular granulosa and theca interna cells synthesize increasing amounts of **Estradiol-17$\\beta$ ($E_2$)**.
- **Physiological & Behavioral Manifestations:**
  - Estrogen induces intense vascular hyperemia, mucosal edema, and cellular proliferation of the tubular genital tract.
  - The cervix begins relaxing and initiates the secretion of clear, watery mucus.
  - **Behavioral Status:** The female is restless, alert, and attracts the male due to pheromonal cues, but **strictly refuses to stand or allow mounting**.

---

### Phase 2: Estrus / Oestrum (Phase of Standing Heat & Sexual Receptivity)
- **Duration:** Averages **18 hours** in cattle, **24 hours** in buffaloes, **24–36 hours** in sheep, and **48–72 hours** in goats and sows.
- **Cardinal Diagnostic Sign:** 
  - **"Standing Heat" (Standing to be Mounted):** The pathognomonic cardinal sign of true estrus. The female stands rigidly immobile when mounted by herdmates, teaser bulls, or under the manual back-pressure test in pigs (lordosis reflex).
- **Secondary Behavioral & Physical Signs:**
  - Frequent bellowing, excitement, reduced feed intake, sudden sharp drop in milk production.
  - Hyperemic, swollen, moist vulva with clear, transparent, highly elastic mucus discharge (**"glaireous discharge"**) hanging in long cohesive strings from the vulva.
  - Teaser bull displays intense chin-resting and flehmen response.
- **Endocrine Surge & Ovulation Timing:**
  - Peak estradiol levels cross the hypothalamic positive-feedback threshold, eliciting the massive pre-ovulatory **Luteinizing Hormone (LH) surge**.
  - **The Cattle Ovulation Trap:** Unlike most domestic species that ovulate during estrus, the dairy cow ovulates **spontaneously 10 to 14 hours AFTER the cessation of estrus** (~30 hours after onset).
- **The Trimberger AM-PM Artificial Insemination (AI) Rule:**
  - *Observed in standing heat in the **Morning (AM)**:* Inseminate in the **Evening (PM)** of the same day.
  - *Observed in standing heat in the **Evening (PM)**:* Inseminate in the **Next Morning (AM)**.
  - *Rationale:* Spermatozoa require 6 to 8 hours in the reproductive tract for biochemical capacitation; the ovum remains viable for only 6 to 10 hours after ovulation.

---

### Phase 3: Metestrus / Metoestrum (Post-Ovulatory Luteinization Phase)
- **Duration & Timing:** Lasts **3 to 4 days** (Day 1 to Day 4 post-estrus).
- **Physiological Cascade:**
  - The ruptured follicular cavity collapses and fills with blood to form the temporary **Corpus Hemorrhagicum**.
  - Under continued basal LH stimulation, granulosa and theca cells undergo hypertrophy and hyperplasia (luteinization) to form the early functional **Corpus Luteum (CL)**.
- **Endocrine Transition & Follicular Arrest:**
  - Estrogen plunges precipitously, while systemic **Progesterone ($P_4$)** begins its steady climb.
  - Rising progesterone suppresses high-frequency LH pulses, preventing further follicular growth beyond medium size, effectively arresting the cycle.
- **Metestrous Bleeding (True Nature & Exam Reality):**
  - Observed in 50% to 80% of heifers and some cows within 24 to 48 hours after ovulation due to capillary breakage during the rapid post-estrus drop in estrogen.
  - **High-Yield Note:** Metestrous bleeding indicates that ovulation has already occurred. It is **NOT** a sign of conception failure, nor does it guarantee pregnancy; it simply signifies that the fertile window for insemination has passed.

---

### Phase 4: Diestrus / Diestrum (Luteal Dominance & Maternal Recognition)
- **Duration:** The **longest phase** of the estrous cycle, spanning **12 to 14 days** (Day 5 to Day 17 in a 21-day cycle).
- **Luteal Dominance:**
  - The fully organized, mature Corpus Luteum dominates the ovary, secreting high sustained concentrations of **Progesterone ($P_4$)**.
  - Progesterone establishes complete uterine quiescence, stimulates endometrial gland arborization to secrete **"uterine milk" (histotroph)**, thickens and seals the cervix with viscous mucus, and maintains strong negative feedback on GnRH/LH pulses.
- **The Divergent Fate of the Cycle:**
  1. **If Pregnancy Occurs (Maternal Recognition of Pregnancy - MRP):**
     - The elongating conceptus synthesizes biochemical signals: **Bovine Trophoblast Protein-1 (bTP-1 / Interferon-tau, $\\text{IFN}-\\tau$)** in ruminants, or **Estrogen** in swine.
     - Interferon-tau downregulates uterine endometrial oxytocin receptors, blocking pulsatile PGF2α release. The CL is salvaged and persists as the **Corpus Luteum Graviditatis**.
  2. **If Pregnancy Fails (Luteolysis & Reset):**
     - By Day 16–17 of the non-pregnant cycle, the unoccupied endometrium releases pulsatile **Prostaglandin $F_{2\\alpha}$ ($PGF_{2\\alpha}$)** into the utero-ovarian vein.
     - PGF2α induces rapid vasoconstriction and luteal apoptosis (**Luteolysis**), converting the CL into an avascular, fibrous scar called the **Corpus Albicans**.
     - Systemic progesterone drops precipitously, releasing the pituitary from negative feedback and triggering the onset of a new proestrus.

---

### Pathophysiological Variations: Anestrus & Silent Heat
- **Anestrus:** Absence of cyclic estrus manifestation; categorized into Gestational (normal), Lactational (nursing-induced), Seasonal (photoperiodic), and Nutritional (negative energy balance post-calving).
- **Silent Heat (Sub-estrus):** Physiological ovulation and luteal function occur normally, but the animal displays little to no outward behavioral signs of standing heat. Highly prevalent in Indian Murrah buffaloes during hot summer months. Diagnosed by detecting a functional CL on transrectal palpation or milk progesterone assay (>1 ng/mL).`

  const estrousTraps = `> [!WARNING]
  > **Exam Trap & High-Yield Differentiation Rules:**
  > 1. **Trimberger AM-PM Rule for AI:** Inseminate late in estrus! Morning heat $\\rightarrow$ Evening AI; Evening heat $\\rightarrow$ Next Morning AI. Inseminating too early leads to aged sperm; inseminating too late misses the 6–10 hour ovum viability window.
  > 2. **Cattle Ovulation is Post-Estrual:** Cattle ovulate **10 to 14 hours AFTER estrus terminates**, unlike sheep, goats, and pigs which ovulate before the end of estrus.
  > 3. **Metestrous Bleeding:** Bleeding 1–2 days after heat is **normal in heifers** (post-ovulatory capillary hemorrhage). It is NOT menstruation, does NOT mean conception failure, and indicates the animal is past the insemination window.
  > 4. **Longest vs. Shortest Cycle Stages:** **Diestrum is the longest phase (~14 days)**, whereas **Estrus is the shortest (~18 hours in cattle)**. Metoestrum lasts ~4 days and Proestrum lasts ~2–3 days.
  > 5. **Mare Heat Duration:** Horses have the longest estrus duration among farm animals: **5 to 7 days**.`

  const estrousRelatedTerms = [
    'Proestrum',
    'Proestrus',
    'Metoestrum',
    'Metestrus',
    'Diestrum',
    'Diestrus',
    'Estrous Cycle Duration',
    'Estrus Phase',
    'Oestrum',
    'Standing Heat',
    'Luteal Phase',
    'Follicular Phase',
    'Silent Heat',
    'Luteolysis',
    'Metestrous Bleeding',
    'AM-PM Rule',
    'Trimberger Rule',
    'Corpus Luteum',
    'Teaser Bull'
  ]

  // Collect all questions from 84, 83, 85, 86, 94
  const qList84 = await prisma.question.findMany({
    where: { concepts: { some: { id: { in: [84, 83, 85, 86, 94] } } } },
    select: { id: true }
  })
  console.log(`Found ${qList84.length} total questions linked across Estrous Cycle concepts (84, 83, 85, 86, 94).`)

  // Update canonical Concept 84
  await prisma.chapterConcept.update({
    where: { id: 84 },
    data: {
      term: 'Oestrous Cycle & Phases',
      slug: 'estrus-phase',
      category: 'Reproductive Physiology & Lifecycle Management',
      subCategory: 'Oestrus Cycle & Hormones',
      definition: estrousDefinition,
      content: estrousContent,
      examTraps: estrousTraps,
      relatedTerms: estrousRelatedTerms,
      questions: {
        connect: qList84.map(q => ({ id: q.id }))
      }
    }
  })
  console.log('✅ Concept 84 updated to "Oestrous Cycle & Phases" with all questions connected.')

  // Delete deprecated concepts 83, 85, 86, 94
  for (const depId of [83, 85, 86, 94]) {
    try {
      await prisma.chapterConcept.delete({ where: { id: depId } })
      console.log(`🗑️ Deleted deprecated concept ID ${depId}.`)
    } catch (e: any) {
      console.log(`Notice for concept ${depId}: ${e.message}`)
    }
  }

  // =========================================================================
  // 3. UPDATE CHAPTER 10 MINDMAP TREEDATA
  // =========================================================================
  console.log('\n--- Updating Chapter 10 MindMap treeData ---')
  const chapter10 = await prisma.chapter.findUnique({
    where: { id: 10 },
    include: { mindMap: true }
  })

  if (chapter10?.mindMap) {
    const treeData = chapter10.mindMap.treeData as any
    if (treeData && Array.isArray(treeData.categories)) {
      for (const cat of treeData.categories) {
        if (cat.name === 'Reproductive Physiology & Lifecycle Management') {
          for (const sub of cat.subCategories || []) {
            if (sub.name === 'Reproductive Metrics & Parameters') {
              console.log('Updating keywords in "Reproductive Metrics & Parameters"')
              // Replace "Gestation Period", "Swine Gestation Period", "Goat Gestation Period" with "Gestation Period & Parturition"
              const updatedKeywords: string[] = []
              let addedGestation = false
              for (const kw of sub.keywords || []) {
                if (['gestation period', 'swine gestation period', 'goat gestation period'].includes(kw.toLowerCase().trim())) {
                  if (!addedGestation) {
                    updatedKeywords.push('Gestation Period & Parturition')
                    addedGestation = true
                  }
                } else {
                  updatedKeywords.push(kw)
                }
              }
              sub.keywords = updatedKeywords
            }

            if (sub.name === 'Oestrus Cycle & Hormones') {
              console.log('Updating keywords in "Oestrus Cycle & Hormones"')
              // Replace "Proestrum", "Estrus Phase", "Metoestrum", "Diestrum", "Estrous Cycle Duration" with "Oestrous Cycle & Phases"
              const updatedKeywords: string[] = []
              let addedEstrous = false
              for (const kw of sub.keywords || []) {
                if (['proestrum', 'estrus phase', 'metoestrum', 'diestrum', 'estrous cycle duration'].includes(kw.toLowerCase().trim())) {
                  if (!addedEstrous) {
                    updatedKeywords.push('Oestrous Cycle & Phases')
                    addedEstrous = true
                  }
                } else {
                  updatedKeywords.push(kw)
                }
              }
              sub.keywords = updatedKeywords
            }
          }
        }
      }

      // Also clean up rawKeywords
      const rawKeywordsSet = new Set<string>()
      for (const cat of treeData.categories) {
        for (const sub of cat.subCategories || []) {
          for (const kw of sub.keywords || []) {
            rawKeywordsSet.add(kw)
          }
        }
      }

      await prisma.chapterMindMap.update({
        where: { id: chapter10.mindMap.id },
        data: {
          treeData: treeData,
          rawKeywords: Array.from(rawKeywordsSet),
          lastSyncAt: new Date()
        }
      })
      console.log('✅ Chapter 10 MindMap treeData and rawKeywords updated successfully.')
    }
  }

  console.log('\n🎉 Consolidation completed successfully!')
}

consolidate()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
