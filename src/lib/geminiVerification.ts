import prisma from '@/lib/prisma'

export type VerificationResult = {
  status: 'AUTO_CORRECTED' | 'NEEDS_ADMIN_REVIEW' | 'DISMISSED' | 'ADMIN_RESOLVED'
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  reasoning: string
  previousAnswer?: string
  suggestedAnswer?: string
  suggestedExplanation?: string
}

export async function verifyQuestionWithGemini(
  questionId: number,
  userReason: string,
  userNote?: string | null
): Promise<VerificationResult> {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { quiz: true }
  })

  if (!question) {
    throw new Error(`Question with id ${questionId} not found`)
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey.trim() === '') {
    return {
      status: 'NEEDS_ADMIN_REVIEW',
      confidence: 'LOW',
      reasoning: 'GEMINI_API_KEY is not configured in the environment. Sent to manual queue for admin verification.',
      previousAnswer: question.correctAnswer,
      suggestedAnswer: undefined,
    }
  }

  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const systemPrompt = `You are an expert exam auditor and subject-matter verifier for competitive examinations and multiple-choice questions (MCQs).
Your task is to critically analyze a reported MCQ, verify the question accuracy, evaluate the options, and verify the correct answer.

CRITICAL INSTRUCTIONS FOR AUTO-CORRECTION:
1. ONLY mark "canAutoCorrect": true if ALL of the following criteria are met:
   a. "confidence" is "HIGH" (you are 100% indisputably sure based on standard authoritative textbooks, scientific taxonomy, government data, or mathematics).
   b. The current answer in the database is objectively WRONG.
   c. Exactly ONE option (A, B, C, D, or E) is unequivocally the single correct answer.
   d. The question stem and the correct option are clear and free of fatal ambiguity.
2. If there are:
   - Multiple defensible options
   - No valid options
   - Ambiguous phrasing that requires rewriting
   - A question typo or wording debate
   - Any doubt whatsoever
   THEN you MUST set "confidence": "MEDIUM" or "LOW", and "canAutoCorrect": false.
3. If the current answer is already correct (false alarm by user), set "isCurrentAnswerCorrect": true, "canAutoCorrect": false, "confidence": "HIGH" (or "MEDIUM"), and explain why the existing answer is indeed correct.

Output your response strictly as valid JSON adhering to the specified schema.`

  const userPrompt = `
QUESTION DETAILS:
- Subject / Quiz Context: ${question.quiz?.name || 'General'}
- Topic: ${question.topic || 'N/A'}
- Question Text: "${question.questionText}"
- Option A: "${question.optionA}"
- Option B: "${question.optionB}"
- Option C: "${question.optionC}"
- Option D: "${question.optionD}"
${question.optionE ? `- Option E: "${question.optionE}"` : ''}

CURRENT ANSWER IN DATABASE: ${question.correctAnswer}
CURRENT EXPLANATION: ${question.explanation || 'None provided'}

USER REPORT DETAILS:
- Reason Selected: ${userReason}
- User Note: ${userNote ? `"${userNote}"` : 'None'}

Evaluate this question and provide your assessment in this JSON format:
{
  "isCurrentAnswerCorrect": boolean,
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "canAutoCorrect": boolean,
  "correctedAnswer": "A" | "B" | "C" | "D" | "E" | null,
  "reasoning": "Clear explanation of your verification findings and reasoning",
  "suggestedExplanation": "A concise, accurate explanation for students (or null)"
}
`

  try {
    let response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: systemPrompt },
              { text: userPrompt }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      })
    })

    // If the specified model returns 404, fallback strictly to gemini-3.5-flash
    if (response.status === 404 && model !== 'gemini-3.5-flash') {
      console.warn(`Model ${model} returned 404. Attempting fallback to gemini-3.5-flash...`)
      const fallbackEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`
      response = await fetch(fallbackEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: systemPrompt },
                { text: userPrompt }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1
          }
        })
      })
    }

    if (!response.ok) {
      const errText = await response.text()
      console.error('Gemini API call failed:', response.status, errText)
      return {
        status: 'NEEDS_ADMIN_REVIEW',
        confidence: 'LOW',
        reasoning: `Gemini API returned error (${response.status}). Sent to manual verification queue.`,
        previousAnswer: question.correctAnswer
      }
    }

    const data = await response.json()
    const contentText = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!contentText) {
      return {
        status: 'NEEDS_ADMIN_REVIEW',
        confidence: 'LOW',
        reasoning: 'Empty response received from Gemini. Sent to manual verification queue.',
        previousAnswer: question.correctAnswer
      }
    }

    const parsed = JSON.parse(contentText)
    const canAuto = Boolean(parsed.canAutoCorrect)
    const confidence = (['HIGH', 'MEDIUM', 'LOW'].includes(parsed.confidence) ? parsed.confidence : 'LOW') as 'HIGH' | 'MEDIUM' | 'LOW'
    const newAnswer = parsed.correctedAnswer ? String(parsed.correctedAnswer).toUpperCase().trim() : null
    const isCurrentCorrect = Boolean(parsed.isCurrentAnswerCorrect)

    // Case 1: AI is HIGH confidence and identified an incorrect answer key -> Auto-Correct in DB
    if (
      canAuto &&
      confidence === 'HIGH' &&
      newAnswer &&
      ['A', 'B', 'C', 'D', 'E'].includes(newAnswer) &&
      newAnswer !== question.correctAnswer.toUpperCase()
    ) {
      // Auto-update in the database
      await prisma.question.update({
        where: { id: questionId },
        data: {
          correctAnswer: newAnswer,
          ...(parsed.suggestedExplanation ? { explanation: parsed.suggestedExplanation } : {})
        }
      })

      return {
        status: 'AUTO_CORRECTED',
        confidence: 'HIGH',
        reasoning: parsed.reasoning || `AI verified answer should be ${newAnswer} instead of ${question.correctAnswer}.`,
        previousAnswer: question.correctAnswer,
        suggestedAnswer: newAnswer,
        suggestedExplanation: parsed.suggestedExplanation || undefined
      }
    }

    // Case 2: AI is HIGH confidence that the current question & answer are ALREADY correct (false report)
    // Auto-resolve directly into Resolved History so the solo developer queue is never cluttered
    if (
      confidence === 'HIGH' &&
      (isCurrentCorrect || (newAnswer && newAnswer === question.correctAnswer.toUpperCase()) || (!canAuto && (!newAnswer || newAnswer === question.correctAnswer.toUpperCase())))
    ) {
      return {
        status: 'DISMISSED',
        confidence: 'HIGH',
        reasoning: parsed.reasoning || `AI verified with HIGH confidence that the current answer (${question.correctAnswer}) is accurate. Automatically resolved.`,
        previousAnswer: question.correctAnswer,
        suggestedAnswer: question.correctAnswer,
        suggestedExplanation: parsed.suggestedExplanation || undefined
      }
    }

    // Case 3: Edge cases where AI is uncertain (MEDIUM/LOW confidence, wording ambiguity, question needs rewrite)
    // Only these land in the manual review queue for the admin
    return {
      status: 'NEEDS_ADMIN_REVIEW',
      confidence,
      reasoning: parsed.reasoning || 'AI flagged for manual review by admin.',
      previousAnswer: question.correctAnswer,
      suggestedAnswer: newAnswer || undefined,
      suggestedExplanation: parsed.suggestedExplanation || undefined
    }

  } catch (error: any) {
    console.error('Error during Gemini verification:', error)
    return {
      status: 'NEEDS_ADMIN_REVIEW',
      confidence: 'LOW',
      reasoning: `AI evaluation exception: ${error?.message || 'Unknown error'}. Sent to manual verification queue.`,
      previousAnswer: question.correctAnswer
    }
  }
}
