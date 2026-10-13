import 'dotenv/config'
import prisma from '../src/lib/prisma'

async function main() {
  const chapter = await prisma.chapter.findFirst({
    where: { name: 'Animal Husbandry' },
    include: { quizzes: { include: { questions: { take: 10 } } } }
  })

  if (!chapter) {
    console.error('Animal Husbandry not found')
    return
  }

  console.log(`Seeding sample mindmap and capsules for ${chapter.name}...`)

  // Sample Chapter Mind Map Tree
  const sampleTree = {
    chapterId: chapter.id,
    chapterName: chapter.name,
    categories: [
      {
        name: 'Reproduction & Lifecycle',
        description: 'Breeding parameters, gestation, parturition, and estrous cycles across livestock',
        subCategories: [
          {
            name: 'Gestation & Parturition',
            keywords: ['Gestation Period', 'Colostrum', 'Dry Period', 'Parturition Terms', 'Calving Interval']
          },
          {
            name: 'Breeding Cycles',
            keywords: ['Oestrus Cycle', 'Artificial Insemination', 'Superovulation', 'Silent Heat']
          }
        ]
      },
      {
        name: 'Farm Management Practices',
        description: 'Livestock management, handling, castration, and daily dairy practices',
        subCategories: [
          {
            name: 'Routine Operations',
            keywords: ['Dehorning / Disbudding', 'Castration (Burdizzo)', 'Culling & Casting', 'Deworming']
          },
          {
            name: 'Special Feeding',
            keywords: ['Steaming Up', 'Flushing', 'Creep Feeding', 'Challenge Feeding']
          }
        ]
      },
      {
        name: 'Milk & Dairy Technology',
        description: 'Milk synthesis, constituents, quality standards, and processing',
        subCategories: [
          {
            name: 'Milk Composition',
            keywords: ['A1 vs A2 Milk', 'Fat & SNF Standards', 'Specific Gravity (Lactometer)', 'Mastitis (CMT Test)']
          }
        ]
      }
    ],
    crossBranchEdges: [
      {
        from: 'Steaming Up',
        to: 'Gestation Period',
        relationType: 'LIFECYCLE',
        label: 'Practiced 2-3 weeks before calving in late gestation'
      },
      {
        from: 'Flushing',
        to: 'Steaming Up',
        relationType: 'CONTRAST',
        label: 'Flushing is pre-mating; Steaming up is pre-parturition'
      },
      {
        from: 'Colostrum',
        to: 'Gestation Period',
        relationType: 'LIFECYCLE',
        label: 'Secreted immediately post-parturition'
      },
      {
        from: 'Castration (Burdizzo)',
        to: 'Culling & Casting',
        relationType: 'CO_OCCURRENCE',
        label: 'Routine farm management practices'
      }
    ],
    allKeywords: [
      'Gestation Period', 'Colostrum', 'Dry Period', 'Parturition Terms', 'Calving Interval',
      'Oestrus Cycle', 'Artificial Insemination', 'Superovulation', 'Silent Heat',
      'Dehorning / Disbudding', 'Castration (Burdizzo)', 'Culling & Casting', 'Deworming',
      'Steaming Up', 'Flushing', 'Creep Feeding', 'Challenge Feeding',
      'A1 vs A2 Milk', 'Fat & SNF Standards', 'Specific Gravity (Lactometer)', 'Mastitis (CMT Test)'
    ]
  }

  await prisma.chapterMindMap.upsert({
    where: { chapterId: chapter.id },
    create: {
      chapterId: chapter.id,
      treeData: sampleTree as any,
      rawKeywords: sampleTree.allKeywords,
      lastSyncAt: new Date()
    },
    update: {
      treeData: sampleTree as any,
      rawKeywords: sampleTree.allKeywords,
      lastSyncAt: new Date()
    }
  })

  // Sample Capsule 1: Gestation Period
  const gestationQuestions = await prisma.question.findMany({
    where: {
      quiz: { chapterId: chapter.id },
      OR: [
        { questionText: { contains: 'gestation', mode: 'insensitive' } },
        { explanation: { contains: 'gestation', mode: 'insensitive' } }
      ]
    },
    take: 5
  })

  await prisma.chapterConcept.upsert({
    where: {
      chapterId_slug: {
        chapterId: chapter.id,
        slug: 'gestation-period'
      }
    },
    create: {
      chapterId: chapter.id,
      term: 'Gestation Period',
      slug: 'gestation-period',
      category: 'Reproduction & Lifecycle',
      subCategory: 'Gestation & Parturition',
      definition: 'The time elapsed between conception (fertilization of the ovum) and parturition (giving birth) in livestock species.',
      content: `### High-Yield Comparative Species Matrix

| Livestock Species | Average Gestation Period (Days) | Approximate Rule of Thumb |
| :--- | :--- | :--- |
| **Cow (Cattle)** | **280 – 285 days** | 9 months 9 days |
| **Buffalo** | **310 days** | 10 months 10 days |
| **Sheep (Ewe)** | **148 – 150 days** | 5 months minus 5 days |
| **Goat (Doe)** | **150 – 152 days** | 5 months |
| **Sow (Pig)** | **114 days** | **3 months, 3 weeks, 3 days** |
| **Mare (Horse)** | **335 – 345 days** | 11 months 11 days |
| **Camel** | **390 – 410 days** | ~13 months |
| **Elephant** | **600 – 660 days** | 20 – 22 months |

### Key Examination Characteristics
- **Variability Factors**: Twin pregnancies shorten gestation by 3–6 days. Male calves generally have 1–2 days longer gestation than female calves.
- **Dry Period Transition**: Cattle are dried off 60 days prior to expected calving to allow mammary gland involution and regeneration.`,
      examTraps: `> ⚠️ **Examiner Trap:**
> - In NABARD/AFO, **Sow (Pig)** is frequently tested via the memory trick: **3 months, 3 weeks, 3 days (114 days)**.
> - **Buffalo (310 days)** is often confused with Cow (282 days). Remember: Buffalo is 1 month longer!`,
      relatedTerms: ['Colostrum', 'Dry Period', 'Parturition Terms', 'Steaming Up'],
      questions: {
        connect: gestationQuestions.map(q => ({ id: q.id }))
      }
    },
    update: {
      term: 'Gestation Period',
      category: 'Reproduction & Lifecycle',
      subCategory: 'Gestation & Parturition',
      definition: 'The time elapsed between conception (fertilization of the ovum) and parturition (giving birth) in livestock species.',
      content: `### High-Yield Comparative Species Matrix

| Livestock Species | Average Gestation Period (Days) | Approximate Rule of Thumb |
| :--- | :--- | :--- |
| **Cow (Cattle)** | **280 – 285 days** | 9 months 9 days |
| **Buffalo** | **310 days** | 10 months 10 days |
| **Sheep (Ewe)** | **148 – 150 days** | 5 months minus 5 days |
| **Goat (Doe)** | **150 – 152 days** | 5 months |
| **Sow (Pig)** | **114 days** | **3 months, 3 weeks, 3 days** |
| **Mare (Horse)** | **335 – 345 days** | 11 months 11 days |
| **Camel** | **390 – 410 days** | ~13 months |
| **Elephant** | **600 – 660 days** | 20 – 22 months |

### Key Examination Characteristics
- **Variability Factors**: Twin pregnancies shorten gestation by 3–6 days. Male calves generally have 1–2 days longer gestation than female calves.
- **Dry Period Transition**: Cattle are dried off 60 days prior to expected calving to allow mammary gland involution and regeneration.`,
      examTraps: `> ⚠️ **Examiner Trap:**
> - In NABARD/AFO, **Sow (Pig)** is frequently tested via the memory trick: **3 months, 3 weeks, 3 days (114 days)**.
> - **Buffalo (310 days)** is often confused with Cow (282 days). Remember: Buffalo is 1 month longer!`,
      relatedTerms: ['Colostrum', 'Dry Period', 'Parturition Terms', 'Steaming Up'],
      questions: {
        connect: gestationQuestions.map(q => ({ id: q.id }))
      }
    }
  })

  // Sample Capsule 2: Colostrum
  const colostrumQuestions = await prisma.question.findMany({
    where: {
      quiz: { chapterId: chapter.id },
      OR: [
        { questionText: { contains: 'colostrum', mode: 'insensitive' } },
        { explanation: { contains: 'colostrum', mode: 'insensitive' } }
      ]
    },
    take: 5
  })

  await prisma.chapterConcept.upsert({
    where: {
      chapterId_slug: {
        chapterId: chapter.id,
        slug: 'colostrum'
      }
    },
    create: {
      chapterId: chapter.id,
      term: 'Colostrum',
      slug: 'colostrum',
      category: 'Reproduction & Lifecycle',
      subCategory: 'Gestation & Parturition',
      definition: 'The thick, yellowish first milk secreted by the mammary glands of female mammals immediately following parturition for 3 to 4 days.',
      content: `### Colostrum vs. Normal Whole Milk Comparison

| Nutrient / Parameter | Bovine Colostrum | Normal Cow Milk | Exam Significance |
| :--- | :--- | :--- | :--- |
| **Total Solids** | **28.3%** | 12.8% | Over 2x higher solids |
| **Total Protein** | **14.0 – 17.5%** | 3.2 – 3.5% | Dominated by Immunoglobulins |
| **Immunoglobulins (IgG)** | **6.0 – 8.0%** | < 0.1% | Confers **Passive Immunity** |
| **Fat Content** | **5.4 – 6.7%** | 3.5 – 4.5% | High energy for neonate |
| **Lactose** | **2.7%** | 4.8% | **Lower** in colostrum (prevents diarrhea) |
| **Specific Gravity** | **1.050 – 1.080** | 1.028 – 1.032 | Significantly denser |
| **Vitamin A / Carotene** | **10x higher** | Normal | Imparts the deep golden yellow color |

### Golden Management Rules
1. **Timing Window**: Must be fed within **1 to 2 hours** of birth. The neonatal calf's intestinal mucosa ceases absorbing intact immunoglobulin macromolecules after 24 hours (*gut closure*).
2. **Feeding Quantity**: Feed at the rate of **10% of calf body weight** per 24 hours (divided into 2–3 daily feedings).
3. **Heat Sensitivity**: Coagulates on heating due to high globulin/albumin content. Cannot be pasteurized by conventional high-temp methods.`,
      examTraps: `> ⚠️ **Examiner Trap:**
> - Questions often ask: *"Colostrum is deficient in which component compared to normal milk?"* $\rightarrow$ **Lactose**!
> - The antibody responsible for systemic protection is **IgG** (makes up 80-85% of colostrum antibodies).`,
      relatedTerms: ['Gestation Period', 'A1 vs A2 Milk', 'Steaming Up'],
      questions: {
        connect: colostrumQuestions.map(q => ({ id: q.id }))
      }
    },
    update: {
      term: 'Colostrum',
      category: 'Reproduction & Lifecycle',
      subCategory: 'Gestation & Parturition',
      definition: 'The thick, yellowish first milk secreted by the mammary glands of female mammals immediately following parturition for 3 to 4 days.',
      content: `### Colostrum vs. Normal Whole Milk Comparison

| Nutrient / Parameter | Bovine Colostrum | Normal Cow Milk | Exam Significance |
| :--- | :--- | :--- | :--- |
| **Total Solids** | **28.3%** | 12.8% | Over 2x higher solids |
| **Total Protein** | **14.0 – 17.5%** | 3.2 – 3.5% | Dominated by Immunoglobulins |
| **Immunoglobulins (IgG)** | **6.0 – 8.0%** | < 0.1% | Confers **Passive Immunity** |
| **Fat Content** | **5.4 – 6.7%** | 3.5 – 4.5% | High energy for neonate |
| **Lactose** | **2.7%** | 4.8% | **Lower** in colostrum (prevents diarrhea) |
| **Specific Gravity** | **1.050 – 1.080** | 1.028 – 1.032 | Significantly denser |
| **Vitamin A / Carotene** | **10x higher** | Normal | Imparts the deep golden yellow color |

### Golden Management Rules
1. **Timing Window**: Must be fed within **1 to 2 hours** of birth. The neonatal calf's intestinal mucosa ceases absorbing intact immunoglobulin macromolecules after 24 hours (*gut closure*).
2. **Feeding Quantity**: Feed at the rate of **10% of calf body weight** per 24 hours (divided into 2–3 daily feedings).
3. **Heat Sensitivity**: Coagulates on heating due to high globulin/albumin content. Cannot be pasteurized by conventional high-temp methods.`,
      examTraps: `> ⚠️ **Examiner Trap:**
> - Questions often ask: *"Colostrum is deficient in which component compared to normal milk?"* $\rightarrow$ **Lactose**!
> - The antibody responsible for systemic protection is **IgG** (makes up 80-85% of colostrum antibodies).`,
      relatedTerms: ['Gestation Period', 'A1 vs A2 Milk', 'Steaming Up'],
      questions: {
        connect: colostrumQuestions.map(q => ({ id: q.id }))
      }
    }
  })

  // Sample Capsule 3: Castration (Burdizzo)
  await prisma.chapterConcept.upsert({
    where: {
      chapterId_slug: {
        chapterId: chapter.id,
        slug: 'castration-burdizzo'
      }
    },
    create: {
      chapterId: chapter.id,
      term: 'Castration (Burdizzo)',
      slug: 'castration-burdizzo',
      category: 'Farm Management Practices',
      subCategory: 'Routine Operations',
      definition: 'Bloodless method of rendering male animals infertile by crushing the spermatic cords without incising the scrotal skin.',
      content: `### Methods of Castration in Farm Animals

| Method | Instrument / Tool | Ideal Age | Nature |
| :--- | :--- | :--- | :--- |
| **Closed / Bloodless** | **Burdizzo Castrator** | 8 – 10 weeks in cattle | Crushes spermatic cord and artery; skin intact |
| **Elastrator** | Heavy rubber ring | Under 1 – 2 weeks | Cuts off blood circulation; scrotum drops off |
| **Open / Surgical** | Scalpel / Knife | Calves & Sheep | Surgical incision; risk of myiasis & infection |

### Objectives of Castration
- **Docility**: Renders bulls docile as working bullocks.
- **Meat Quality**: Prevents male boar/bull taint; promotes marbling and fat deposition.
- **Selective Breeding**: Prevents scrub/undesirable males from breeding.`,
      examTraps: `> ⚠️ **Examiner Trap:**
> - In Burdizzo castration, the instrument crushes the **spermatic cord and blood vessels (pampiniform plexus)**, NOT the testicles themselves. Crushing testicles is an examination error.`,
      relatedTerms: ['Dehorning / Disbudding', 'Culling & Casting'],
      questions: {
        connect: []
      }
    },
    update: {
      term: 'Castration (Burdizzo)',
      category: 'Farm Management Practices',
      subCategory: 'Routine Operations',
      definition: 'Bloodless method of rendering male animals infertile by crushing the spermatic cords without incising the scrotal skin.',
      content: `### Methods of Castration in Farm Animals

| Method | Instrument / Tool | Ideal Age | Nature |
| :--- | :--- | :--- | :--- |
| **Closed / Bloodless** | **Burdizzo Castrator** | 8 – 10 weeks in cattle | Crushes spermatic cord and artery; skin intact |
| **Elastrator** | Heavy rubber ring | Under 1 – 2 weeks | Cuts off blood circulation; scrotum drops off |
| **Open / Surgical** | Scalpel / Knife | Calves & Sheep | Surgical incision; risk of myiasis & infection |

### Objectives of Castration
- **Docility**: Renders bulls docile as working bullocks.
- **Meat Quality**: Prevents male boar/bull taint; promotes marbling and fat deposition.
- **Selective Breeding**: Prevents scrub/undesirable males from breeding.`,
      examTraps: `> ⚠️ **Examiner Trap:**
> - In Burdizzo castration, the instrument crushes the **spermatic cord and blood vessels (pampiniform plexus)**, NOT the testicles themselves. Crushing testicles is an examination error.`,
      relatedTerms: ['Dehorning / Disbudding', 'Culling & Casting'],
      questions: {
        connect: []
      }
    }
  })

  console.log('✅ Seed completed successfully!')
}

main().catch(console.error).finally(() => prisma.$disconnect())
