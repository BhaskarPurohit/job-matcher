import Anthropic from '@anthropic-ai/sdk'
import { buildAnalysisPrompt } from './prompts'
import { AIAnalysisSchema } from './schema'
import type { AIAnalysisResult } from '@/types/analysis'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export class AIAnalysisError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = 'AIAnalysisError'
  }
}

export async function analyzeResume(
  resumeText: string,
  jobDescription: string
): Promise<AIAnalysisResult> {
  const prompt = buildAnalysisPrompt(resumeText, jobDescription)

  let rawContent: string

  try {
    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5',
      max_tokens: 2048,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }],
    })

    rawContent = response.content[0]?.type === 'text' ? response.content[0].text : ''

    if (!rawContent) {
      throw new AIAnalysisError('AI returned an empty response')
    }
  } catch (err) {
    if (err instanceof AIAnalysisError) throw err

    const message = err instanceof Error ? err.message : 'Claude API call failed'
    throw new AIAnalysisError(message, err)
  }

  // Strip markdown fences if Claude wraps the JSON
  const cleaned = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new AIAnalysisError(
      `AI returned invalid JSON. Raw output: ${rawContent.slice(0, 200)}`
    )
  }

  const result = AIAnalysisSchema.safeParse(parsed)
  if (!result.success) {
    throw new AIAnalysisError(
      `AI output failed schema validation: ${result.error.message}`
    )
  }

  return result.data as AIAnalysisResult
}
