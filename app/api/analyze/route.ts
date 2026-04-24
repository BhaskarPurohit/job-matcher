import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { AnalyzeRequestSchema, extractFieldErrors } from '@/lib/ai/schema'
import { computeKeywordScore } from '@/lib/scoring/keywordExtractor'
import { runAIAnalysis, PRIORITY_MAP } from '@/lib/scoring/aiAnalyzer'
import { computeCompositeScore } from '@/lib/scoring/compositeScorer'
import { createClient } from '@/lib/supabase/server'
import type {
  AnalyzeResponse,
  AnalyzeErrorResponse,
  FieldError,
  MatchTier,
  Skill,
  Suggestion,
} from '@/types/analysis'

function getMatchTier(score: number): MatchTier {
  if (score >= 70) return 'strong'
  if (score >= 40) return 'moderate'
  return 'weak'
}

function errorResponse(
  message: string,
  code: AnalyzeErrorResponse['code'],
  status: number,
  fieldErrors: FieldError[] = [],
): NextResponse<AnalyzeErrorResponse> {
  return NextResponse.json(
    { success: false, code, error: message, fieldErrors } satisfies AnalyzeErrorResponse,
    { status },
  )
}

export async function POST(
  req: NextRequest,
): Promise<NextResponse<AnalyzeResponse | AnalyzeErrorResponse>> {

  // ── Step 1: auth ───────────────────────────────────────────────────────────
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return errorResponse('Unauthorized', 'INTERNAL_ERROR', 401)
  }

  // ── Step 2: parse + validate request ──────────────────────────────────────
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return errorResponse('Request body must be valid JSON', 'VALIDATION_ERROR', 400)
  }

  const parsed = AnalyzeRequestSchema.safeParse(body)
  if (!parsed.success) {
    const fieldErrors = extractFieldErrors(parsed.error)
    return errorResponse(fieldErrors[0]?.message ?? 'Invalid request', 'VALIDATION_ERROR', 400, fieldErrors)
  }

  const { resumeText, jobDescription, jobTitle, companyName } = parsed.data

  // ── Step 3: hybrid scoring pipeline (keyword + AI in parallel) ────────────
  const startMs = Date.now()

  let keywordScore: number
  let aiResponse: Awaited<ReturnType<typeof runAIAnalysis>>

  try {
    ;[keywordScore, aiResponse] = await Promise.all([
      Promise.resolve(computeKeywordScore(resumeText, jobDescription)),
      runAIAnalysis(resumeText, jobDescription),
    ])
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Analysis pipeline failed'
    const isRateLimit = message.toLowerCase().includes('rate limit') ||
                        message.toLowerCase().includes('429')
    if (isRateLimit) {
      return errorResponse('AI service is rate limited. Please try again in a moment.', 'RATE_LIMIT', 429)
    }
    console.error('[analyze] Pipeline error:', err)
    return errorResponse('Analysis failed. Please try again.', 'AI_ERROR', 502)
  }

  // ── Step 4: compose final score ────────────────────────────────────────────
  const breakdown    = computeCompositeScore(keywordScore, aiResponse.result.aiScore)
  const { finalScore } = breakdown
  const matchTier    = getMatchTier(finalScore)
  const processingMs = Date.now() - startMs

  // ── Step 5: map AI output → existing Analysis shape ───────────────────────
  // Keep the frontend types stable; translate the new AI schema here.
  const { result } = aiResponse

  const presentSkills: Skill[] = result.presentSkills.map((name) => ({
    name,
    importance: 'preferred' as const,
  }))

  const missingSkills: Skill[] = result.missingSkills.map((s) => ({
    name:       s.skill,
    importance: PRIORITY_MAP[s.priority] ?? 'preferred',
  }))

  const suggestions: Suggestion[] = result.suggestions.map((s) => ({
    section:   s.section,
    suggested: s.recommendation,
    reasoning: '',               // new schema omits reasoning; field kept for type compat
  }))

  // ── Step 6: persist ────────────────────────────────────────────────────────
  const id = randomUUID()

  const { error: insertError } = await supabase.from('analyses').insert({
    id,
    user_id:          user.id,
    job_title:        jobTitle ?? 'Untitled Role',
    company_name:     companyName ?? null,
    match_score:      finalScore,
    match_tier:       matchTier,
    present_skills:   presentSkills,
    missing_skills:   missingSkills,
    strengths:        result.keyStrengths,
    tailored_summary: result.tailoredSummary,
    suggestions,
    processing_ms:    processingMs,
  })

  if (insertError) {
    console.error('[analyze] Supabase insert error:', insertError.code, insertError.message)
    return errorResponse(`Failed to save analysis: ${insertError.message}`, 'INTERNAL_ERROR', 500)
  }

  return NextResponse.json({
    success: true,
    data: {
      id,
      matchScore:      finalScore,
      matchTier,
      presentSkills,
      missingSkills,
      strengths:       result.keyStrengths,
      tailoredSummary: result.tailoredSummary,
      suggestions,
      scoreBreakdown:  breakdown,
      processingMs,
    },
  } satisfies AnalyzeResponse)
}

export function GET()    { return errorResponse('Method not allowed', 'INTERNAL_ERROR', 405) }
export function PUT()    { return errorResponse('Method not allowed', 'INTERNAL_ERROR', 405) }
export function DELETE() { return errorResponse('Method not allowed', 'INTERNAL_ERROR', 405) }
