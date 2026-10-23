const fs = require('fs');
const path = require('path');

const concepts = JSON.parse(fs.readFileSync('scratch_macro1_concepts.json', 'utf8'));

// Group by subcategory in logical order
const subCatOrder = [
  'Pedological Concepts & Foundations',
  'Rocks & Primary/Secondary Minerals',
  'Weathering Processes',
  'Soil Horizons & Pedogenic Processes'
];

let output = `# AUDIO REVISION MASTERCLASS: SOIL FUNDAMENTALS, GENESIS & WEATHERING
### Target Examinations: ICAR-AIEEA / JRF, IBPS-AFO, State AO / AAO, NABARD Grade A, UPSC-Agriculture

> **DIRECTIVE FOR NOTEBOOKLM AUDIO OVERVIEW / PODCAST HOSTS:**
> - You are two distinguished Soil Science and Agriscience exam coaches delivering an authoritative, high-yield audio revision masterclass.
> - The student is listening to this audio while actively viewing the **"Soil Fundamentals, Genesis & Weathering"** macro topic on their platform screen.
> - **Follow-Along Rule**: Clearly announce each subcategory and enunciate each specific keyword by name before breaking it down, so the student can follow along seamlessly on their screen.
> - **Pedagogical Style**: Conversational, engaging, and crisp. Use vivid physical analogies, highlight the numerical constants, contrast easily confused pairs (e.g. Pedology vs Edaphology, Solum vs Regolith, Pedon vs Polypedon, Eluviation vs Illuviation), and explicitly warn students about classic MCQ distractor traps.
> - Cover all 49 keywords across the 4 key sections systematically.

---

`;

for (const subCat of subCatOrder) {
  const subConcepts = concepts.filter(c => c.subCategory === subCat);
  if (!subConcepts.length) continue;

  output += `\n================================================================================\n`;
  output += `## MODULE: ${subCat.toUpperCase()} (${subConcepts.length} KEYWORDS)\n`;
  output += `================================================================================\n\n`;
  output += `**Keywords in this Module**: ${subConcepts.map((c, i) => `(${i + 1}) ${c.term}`).join(', ')}\n\n`;
  output += `> *Host Dialogue Cue*: "Now let's dive into ${subCat}. Follow along on your screen as we unpack these ${subConcepts.length} essential concepts..."\n\n`;

  for (let i = 0; i < subConcepts.length; i++) {
    const c = subConcepts[i];
    output += `### Keyword ${i + 1}: ${c.term}\n\n`;
    output += `**Platform Definition:**\n> "${c.definition}"\n\n`;

    if (c.content) {
      output += `**High-Yield Study Notes & Comparative Matrices:**\n`;
      output += `${c.content.trim()}\n\n`;
    }

    if (c.examTraps) {
      output += `**Examiner Traps & PYQ Alerts:**\n`;
      output += `${c.examTraps.trim()}\n\n`;
    }

    output += `---\n\n`;
  }
}

// Ensure Notes/Audio_Briefs directory exists
const outDir = path.join(__dirname, 'Notes', 'Audio_Briefs');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const targetFile = path.join(outDir, '01_soil_fundamentals_genesis_and_weathering_audio_brief.md');
fs.writeFileSync(targetFile, output, 'utf8');
console.log(`Generated audio brief at: ${targetFile} (${(output.length / 1024).toFixed(1)} KB)`);

// Also generate a dedicated standalone brief for just Pedological Concepts & Foundations (the 11 terms in the screenshot)
const pedoConcepts = concepts.filter(c => c.subCategory === 'Pedological Concepts & Foundations');
let pedoOutput = `# QUICK-HIT AUDIO BRIEF: PEDOLOGICAL CONCEPTS & FOUNDATIONS (11 KEYWORDS)
### Target Focus: Soil Science Core Definitions & Scientists (ICAR, IBPS-AFO, State AO)

> **DIRECTIVE FOR NOTEBOOKLM HOSTS:**
> - Deliver a focused, lively 5-to-8 minute deep dive into the foundational 11 terms of Soil Pedology.
> - The listener has the **Pedological Concepts & Foundations** subcategory open on their screen.
> - Walk through all 11 terms in exact order: 
>   1. Pedology, 2. Edaphology, 3. V. V. Dokuchaev, 4. Hans Jenny, 5. Solum, 6. Regolith, 7. Pedon, 8. Polypedon, 9. Soil Profile, 10. Saprolite, 11. Soil Catena.
> - Emphasize why Dokuchaev is the father of Soil Science, Jenny's active vs passive factors formula, the Solum = A+E+B vs Regolith = A+B+C distinction, and Milne's 1935 Catena concept.

---

`;

for (let i = 0; i < pedoConcepts.length; i++) {
  const c = pedoConcepts[i];
  pedoOutput += `### Keyword ${i + 1}: ${c.term}\n\n`;
  pedoOutput += `**Platform Definition:**\n> "${c.definition}"\n\n`;
  if (c.content) {
    pedoOutput += `${c.content.trim()}\n\n`;
  }
  if (c.examTraps) {
    pedoOutput += `**Exam Warning:**\n${c.examTraps.trim()}\n\n`;
  }
  pedoOutput += `---\n\n`;
}

const pedoFile = path.join(outDir, '01A_pedological_concepts_and_foundations_11_keywords.md');
fs.writeFileSync(pedoFile, pedoOutput, 'utf8');
console.log(`Generated standalone pedo brief at: ${pedoFile} (${(pedoOutput.length / 1024).toFixed(1)} KB)`);
