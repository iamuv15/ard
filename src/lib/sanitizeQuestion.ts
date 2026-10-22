/**
 * Sanitize question stems, options, and explanations.
 * Eliminates raw scraping artifacts (e.g., <style>...</style>, <span>, <p>, &nbsp;)
 * while converting scientific notation (<sup>-1</sup> -> ⁻¹) and maintaining text integrity.
 */

export function sanitizeQuestionText(raw?: string | null): string {
  if (!raw) return ''

  let text = String(raw)

  // 1. Strip entire <style>...</style> blocks and contents
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '')

  // 2. Strip entire <script>...</script> blocks and contents
  text = text.replace(/<script[\s\S]*?<\/script>/gi, '')

  // 3. Remove inner spans/fonts/bold/emphasis before sup/sub matching so nested tags don't break matching
  text = text.replace(/<\/?(span|font|b|strong|i|em)[^>]*>/gi, '')

  // 4. Convert superscripts (standard for chemical/soil units like dSm⁻¹, m³, etc.)
  text = text.replace(/<sup>\s*-1\s*<\/sup>/gi, '⁻¹')
  text = text.replace(/<sup>\s*1\s*<\/sup>/gi, '¹')
  text = text.replace(/<sup>\s*2\s*<\/sup>/gi, '²')
  text = text.replace(/<sup>\s*3\s*<\/sup>/gi, '³')
  text = text.replace(/<sup>\s*4\s*<\/sup>/gi, '⁴')
  text = text.replace(/<sup>\s*([+-]?[0-9a-zA-Z]+)\s*<\/sup>/gi, '^$1')

  // 5. Convert subscripts
  text = text.replace(/<sub>\s*0\s*<\/sub>/gi, '₀')
  text = text.replace(/<sub>\s*1\s*<\/sub>/gi, '₁')
  text = text.replace(/<sub>\s*2\s*<\/sub>/gi, '₂')
  text = text.replace(/<sub>\s*3\s*<\/sub>/gi, '₃')
  text = text.replace(/<sub>\s*4\s*<\/sub>/gi, '₄')
  text = text.replace(/<sub>\s*([0-9a-zA-Z]+)\s*<\/sub>/gi, '_$1')

  // 6. Replace line breaks with a space
  text = text.replace(/<br\s*\/?>/gi, ' ')

  // 7. Strip remaining wrapper tags
  text = text.replace(/<\/?(p|div|u|strike|small|big|center|h[1-6]|table|tr|td|tbody|thead)[^>]*>/gi, '')

  // 8. Convert <img src="..."> to image url or markdown
  text = text.replace(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi, '$1 ')

  // 9. Strip any leftover HTML/XML tag markers
  text = text.replace(/<[^>]+>/g, '')

  // 10. Decode common HTML entities
  text = text.replace(/&nbsp;/gi, ' ')
  text = text.replace(/&amp;/gi, '&')
  text = text.replace(/&lt;/gi, '<')
  text = text.replace(/&gt;/gi, '>')
  text = text.replace(/&quot;/gi, '"')
  text = text.replace(/&#39;|&apos;/gi, "'")
  text = text.replace(/&deg;/gi, '°')
  text = text.replace(/&mu;/gi, 'µ')
  text = text.replace(/&plusmn;/gi, '±')

  // 11. Normalize spaces & trim
  text = text.replace(/[ \t]+/g, ' ').trim()

  return text
}

export function sanitizeQuestionPayload<T extends {
  questionText: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  optionE?: string | null
  explanation?: string | null
  topic?: string | null
}>(q: T): T {
  return {
    ...q,
    questionText: sanitizeQuestionText(q.questionText),
    optionA: sanitizeQuestionText(q.optionA),
    optionB: sanitizeQuestionText(q.optionB),
    optionC: sanitizeQuestionText(q.optionC),
    optionD: sanitizeQuestionText(q.optionD),
    optionE: q.optionE ? sanitizeQuestionText(q.optionE) : null,
    explanation: q.explanation ? sanitizeQuestionText(q.explanation) : null,
    topic: q.topic ? sanitizeQuestionText(q.topic) : null,
  }
}
