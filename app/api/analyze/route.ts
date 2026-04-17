import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { analyzeResume, AIAnalysisError } from '@/lib/ai/analyze'
import { AnalyzeRequestSchema, extractFieldErrors } from '@/lib/ai/schema'
import { createClient } from '@/lib/supabase/server'
import type {
  AnalyzeResponse,
  AnalyzeErrorResponse,
  FieldError,
  MatchTier,
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

  // ── Step 1: get authenticated user ────────────────────────────────────────
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

  // ── Step 3: run AI analysis ───────────────────────────────────────────────
  const startMs = Date.now()

  try {
    const result = await analyzeResume(resumeText, jobDescription)
    const processingMs = Date.now() - startMs
    const matchTier = getMatchTier(result.matchScore)
    const id = randomUUID()

    // ── Step 4: persist to Supabase ───────────────────────────────────────
    const { error: insertError } = await supabase.from('analyses').insert({
      id,
      user_id:         user.id,
      job_title:       jobTitle ?? 'Untitled Role',
      company_name:    companyName ?? null,
      match_score:     result.matchScore,
      match_tier:      matchTier,
      present_skills:  result.presentSkills,
      missing_skills:  result.missingSkills,
      strengths:       result.strengths,
      tailored_summary: result.tailoredSummary,
      suggestions:     result.suggestions,
      processing_ms:   processingMs,
    })

    if (insertError) {
      console.error('[analyze] Supabase insert error:', insertError.code, insertError.message, insertError.details)
      return errorResponse(`Failed to save analysis: ${insertError.message}`, 'INTERNAL_ERROR', 500)
    }

    return NextResponse.json({
      success: true,
      data: { id, ...result, matchTier, processingMs },
    } satisfies AnalyzeResponse)

  } catch (err) {
    if (err instanceof AIAnalysisError) {
      const isRateLimit =
        err.message.toLowerCase().includes('rate limit') ||
        err.message.toLowerCase().includes('429')

      if (isRateLimit) {
        return errorResponse('AI service is rate limited. Please try again in a moment.', 'RATE_LIMIT', 429)
      }

      console.error('[analyze] AI error:', err.message, err.cause)
      return errorResponse('Analysis failed. Please try again.', 'AI_ERROR', 502)
    }

    console.error('[analyze] Unexpected error:', err)
    return errorResponse('An unexpected error occurred', 'INTERNAL_ERROR', 500)
  }
}

export function GET()    { return errorResponse('Method not allowed', 'INTERNAL_ERROR', 405) }
export function PUT()    { return errorResponse('Method not allowed', 'INTERNAL_ERROR', 405) }
export function DELETE() { return errorResponse('Method not allowed', 'INTERNAL_ERROR', 405) }
