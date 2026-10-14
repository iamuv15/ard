require('dotenv').config();
const fs = require('fs');
const path = require('path');

const notesDir = path.resolve('Notes');
const xmlPath = path.join(notesDir, 'extracted_doc.xml');

if (!fs.existsSync(xmlPath)) {
  console.error('Error: extracted_doc.xml not found in Notes!');
  process.exit(1);
}

const xml = fs.readFileSync(xmlPath, 'utf-8');
const pMatches = xml.split('</w:p>');
const paragraphs = [];

for (const p of pMatches) {
  const tMatches = p.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || [];
  const text = tMatches.map(m => m.replace(/<w:t[^>]*>([^<]+)<\/w:t>/, '$1')).join('');
  if (text.trim()) {
    paragraphs.push(text.trim());
  }
}

// Slice Important Facts: paragraphs 3851 to 4103
const rawFacts = paragraphs.slice(3851, 4103).join('\n\n');
console.log(`Extracted PYQ & Important Facts text: ${rawFacts.length} characters (~${Math.round(rawFacts.length / 4)} tokens)`);

const keys = [
  { key: (process.env.GEMINI_API_KEY || '').trim(), label: 'FREE 1 (GEMINI_API_KEY)' },
  { key: (process.env.GEMINI_API_KEY_2 || '').trim(), label: 'FREE 2 (GEMINI_API_KEY_2)' }
].filter(k => k.key.length > 0);

const MODEL = 'gemini-3.5-flash-lite';

async function callGemini(systemPrompt, userPrompt) {
  for (let i = 0; i < keys.length; i++) {
    const { key, label } = keys[i];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;

    try {
      console.log(`[API Call] Contacting Gemini with ${label}...`);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\n---\nRAW PYQ & EXAM FACTS CONTENT:\n${userPrompt}` }]
            }
          ],
          generationConfig: {
            temperature: 0.2
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim().length > 100) {
          console.log(`[API Call] Success with ${label} (received ${text.length} chars)`);
          return text;
        }
      }

      const errText = await res.text();
      console.warn(`[API Call] ${label} returned HTTP ${res.status}: ${errText.slice(0, 160)}`);
    } catch (err) {
      console.warn(`[API Call] ${label} error: ${err.message}`);
    }
  }

  throw new Error('All Gemini API keys failed.');
}

async function run() {
  const targetFile = path.join(notesDir, '08_important_exam_facts_and_one_liners.md');
  console.log(`Generating Master PYQ Reference File: ${targetFile}...`);

  const systemPrompt = `You are a distinguished Veterinary and Agricultural Science professor preparing an authoritative, master Previous Year Questions (PYQ) & Rapid-Fire Exam Fact Sheet for competitive examinations (IBPS-AFO, NABARD, ICAR-JRF, RRB SO, State AO/AAO/PSC).

TASK:
Convert the provided raw exam facts into a comprehensive, uncompressed, beautifully structured master GitHub Markdown file titled:
"# Master Exam One-Liners & Previous Year Questions (PYQs)"

CRITICAL REQUIREMENTS:
1. ZERO OMISSION: Retain EVERY SINGLE fact, year tag (e.g. AFO-2021, RRB SO-2018, NABARD-2021, MP PAT, TNPSC VAS), number, formula, breed trait, disease symptom, and conversion rate. Do not skip or summarize away items.
2. CATEGORIZATION: Organize the facts into thematic, high-contrast sections with clear headings:
   - ## 1. Breeding, Reproduction & Genetics (PYQs)
   - ## 2. Livestock Breeds, Horn Shapes & Distinct Characteristics (PYQs)
   - ## 3. Dairy Science, Milk Composition & Processing Standards (PYQs)
   - ## 4. Feeds, Fodder, Nutrition & Ration Calculation (PYQs)
   - ## 5. Pathology, Diagnostic Signs & Vaccines (PYQs)
   - ## 6. Farm Machinery, Bullock Draft Power, Housing & Economics (PYQs)
   - ## 7. Poultry & Avian Science (PYQs)
   - ## 8. Livestock Census, Institutes & National Benchmarks (PYQs)
3. FORMATTING: Use crisp bullet points, bold key terms, and construct comparative Markdown tables where numbers or comparisons are tested.
4. EXAM TAGS: Highlight all exam occurrences clearly (e.g. **[IBPS-AFO 2020]**, **[RRB SO 2019]**, **[NABARD 2021]**).
5. CLEANLINESS: Fix any OCR typos (e.g. 'oestrus', 'colostrum', 'surti', 'sickle-shaped').

Output strictly pure GitHub Markdown.`;

  const markdown = await callGemini(systemPrompt, rawFacts);
  fs.writeFileSync(targetFile, markdown, 'utf-8');
  console.log(`Successfully saved: ${targetFile} (${fs.statSync(targetFile).size} bytes)`);
}

run();
