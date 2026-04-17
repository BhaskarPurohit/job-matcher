/**
 * tests/api/analyze.test.ts
 *
 * Tests for POST /api/analyze — validation layer only.
 * The AI call is mocked in tests/setup.ts; no real network requests are made.
 *
 * Strategy: call the exported POST handler directly (unit style).
 * We don't need a running server — Next.js route handlers are plain async functions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/analyze/route'
import { analyzeResume } from '@/lib/ai/analyze'
import type { AnalyzeErrorResponse, AnalyzeResponse } from '@/types/analysis'

// ── Fixtures ──────────────────────────────────────────────────────────────────

// Minimum valid inputs — tests that need to pass validation use these.
const VALID_RESUME = 'a'.repeat(100)          // exactly at the 100-char minimum
const VALID_JD     = 'b'.repeat(50)           // exactly at the 50-char minimum

// A minimal AI response that passes AIAnalysisSchema validation.
// Used when we want a test to reach the AI call without failing.
const MOCK_AI_RESULT = {
  matchScore:      75,
  presentSkills:   [{ name: 'TypeScript', importance: 'required' as const }],
  missingSkills:   [{ name: 'Rust',       importance: 'preferred' as const }],
  strengths:       ['Strong React fundamentals'],
  tailoredSummary: 'Experienced frontend engineer with TypeScript expertise.',
  suggestions:     [{
    section:   'experience' as const,
    suggested: 'Quantify performance improvements.',
    reasoning: 'Numbers validate claims.',
  }],
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a NextRequest with a JSON body — mirrors what Next.js receives. */
function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/analyze', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
}

/** Call POST and parse the JSON body. Typed as a union so callers can narrow. */
async function callPOST(body: unknown): Promise<AnalyzeResponse | AnalyzeErrorResponse> {
  const res = await POST(makeRequest(body))
  return res.json() as Promise<AnalyzeResponse | AnalyzeErrorResponse>
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('POST /api/analyze', () => {

  beforeEach(() => {
    // Reset mock call counts and resolved values between tests.
    vi.clearAllMocks()
  })

  // ── Validation: resumeText ─────────────────────────────────────────────────

  describe('resumeText validation', () => {

    it('returns 400 when resumeText is missing', async () => {
      const res = await POST(makeRequest({ jobDescription: VALID_JD }))
      const body = await res.json() as AnalyzeErrorResponse

      expect(res.status).toBe(400)
      expect(body.success).toBe(false)
      expect(body.code).toBe('VALIDATION_ERROR')
      expect(body.fieldErrors.some((e) => e.field === 'resumeText')).toBe(true)
    })

    it('returns 400 when resumeText is too short (< 100 chars)', async () => {
      const res = await POST(makeRequest({
        resumeText:     'a'.repeat(99),   // one under the minimum
        jobDescription: VALID_JD,
      }))
      const body = await res.json() as AnalyzeErrorResponse

      expect(res.status).toBe(400)
      expect(body.success).toBe(false)
      expect(body.code).toBe('VALIDATION_ERROR')

      // The error must be tied to the resumeText field specifically —
      // not a generic "invalid request" that masks which input failed.
      const resumeError = body.fieldErrors.find((e) => e.field === 'resumeText')
      expect(resumeError).toBeDefined()
      expect(resumeError?.message).toMatch(/too short/i)
    })

    it('returns 400 when resumeText is exactly 99 chars', async () => {
      // Boundary value test — 99 should fail, 100 should pass
      const res = await POST(makeRequest({
        resumeText:     'x'.repeat(99),
        jobDescription: VALID_JD,
      }))
      expect((await res.json() as AnalyzeErrorResponse).code).toBe('VALIDATION_ERROR')
    })

    it('returns 400 when resumeText is only whitespace', async () => {
      // 100 spaces passes .min(100) but should be caught by the .refine()
      const res = await POST(makeRequest({
        resumeText:     ' '.repeat(100),
        jobDescription: VALID_JD,
      }))
      const body = await res.json() as AnalyzeErrorResponse

      expect(res.status).toBe(400)
      const resumeError = body.fieldErrors.find((e) => e.field === 'resumeText')
      expect(resumeError?.message).toMatch(/whitespace/i)
    })

    it('returns 400 when resumeText exceeds 15,000 chars', async () => {
      const res = await POST(makeRequest({
        resumeText:     'a'.repeat(15_001),
        jobDescription: VALID_JD,
      }))
      const body = await res.json() as AnalyzeErrorResponse

      expect(res.status).toBe(400)
      const resumeError = body.fieldErrors.find((e) => e.field === 'resumeText')
      expect(resumeError?.message).toMatch(/15,000/i)
    })

    it('accepts resumeText at exactly 100 chars (boundary)', async () => {
      // Arrange: mock the AI so this reaches a 200 response
      vi.mocked(analyzeResume).mockResolvedValueOnce(MOCK_AI_RESULT)

      const res = await POST(makeRequest({
        resumeText:     'a'.repeat(100),
        jobDescription: VALID_JD,
      }))

      // The 100-char input is valid — validation must not reject it
      expect(res.status).toBe(200)
      const body = await res.json() as AnalyzeResponse
      expect(body.success).toBe(true)
    })

  })

  // ── Validation: jobDescription ────────────────────────────────────────────

  describe('jobDescription validation', () => {

    it('returns 400 when jobDescription is missing', async () => {
      const res = await POST(makeRequest({ resumeText: VALID_RESUME }))
      const body = await res.json() as AnalyzeErrorResponse

      expect(res.status).toBe(400)
      expect(body.fieldErrors.some((e) => e.field === 'jobDescription')).toBe(true)
    })

    it('returns 400 when jobDescription is too short (< 50 chars)', async () => {
      const res = await POST(makeRequest({
        resumeText:     VALID_RESUME,
        jobDescription: 'b'.repeat(49),
      }))
      const body = await res.json() as AnalyzeErrorResponse

      expect(res.status).toBe(400)
      const jdError = body.fieldErrors.find((e) => e.field === 'jobDescription')
      expect(jdError).toBeDefined()
      expect(jdError?.message).toMatch(/too short/i)
    })

    it('returns 400 when jobDescription is only whitespace', async () => {
      const res = await POST(makeRequest({
        resumeText:     VALID_RESUME,
        jobDescription: ' '.repeat(50),
      }))
      const body = await res.json() as AnalyzeErrorResponse

      expect(res.status).toBe(400)
      const jdError = body.fieldErrors.find((e) => e.field === 'jobDescription')
      expect(jdError?.message).toMatch(/whitespace/i)
    })

  })

  // ── Validation: both fields fail simultaneously ────────────────────────────

  describe('multiple field errors', () => {

    it('returns errors for both fields when both are invalid', async () => {
      const res = await POST(makeRequest({
        resumeText:     'too short',
        jobDescription: 'also short',
      }))
      const body = await res.json() as AnalyzeErrorResponse

      expect(res.status).toBe(400)
      expect(body.fieldErrors.length).toBeGreaterThanOrEqual(2)

      const fields = body.fieldErrors.map((e) => e.field)
      expect(fields).toContain('resumeText')
      expect(fields).toContain('jobDescription')
    })

    it('fieldErrors is always an array, even for non-validation errors', async () => {
      // The contract: fieldErrors is never undefined or missing.
      // Client code can always destructure it without guarding.
      const res = await POST(makeRequest({
        resumeText:     'too short',
        jobDescription: VALID_JD,
      }))
      const body = await res.json() as AnalyzeErrorResponse

      expect(Array.isArray(body.fieldErrors)).toBe(true)
    })

  })

  // ── Malformed request body ────────────────────────────────────────────────

  describe('malformed requests', () => {

    it('returns 400 when body is not valid JSON', async () => {
      const req = new NextRequest('http://localhost/api/analyze', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    'this is not json{{{',
      })
      const res  = await POST(req)
      const body = await res.json() as AnalyzeErrorResponse

      expect(res.status).toBe(400)
      expect(body.code).toBe('VALIDATION_ERROR')
    })

    it('returns 400 when body is an empty object', async () => {
      const res  = await POST(makeRequest({}))
      const body = await res.json() as AnalyzeErrorResponse

      expect(res.status).toBe(400)
      expect(body.code).toBe('VALIDATION_ERROR')
    })

    it('returns 400 when resumeText is not a string', async () => {
      const res  = await POST(makeRequest({ resumeText: 12345, jobDescription: VALID_JD }))
      const body = await res.json() as AnalyzeErrorResponse

      expect(res.status).toBe(400)
      expect(body.fieldErrors.some((e) => e.field === 'resumeText')).toBe(true)
    })

  })

  // ── Success path (smoke test) ────────────────────────────────────────────

  describe('success path', () => {

    it('returns 200 with analysis data when inputs are valid', async () => {
      vi.mocked(analyzeResume).mockResolvedValueOnce(MOCK_AI_RESULT)

      const res  = await POST(makeRequest({
        resumeText:     VALID_RESUME,
        jobDescription: VALID_JD,
        jobTitle:       'Senior Engineer',
        companyName:    'Acme',
      }))
      const body = await res.json() as AnalyzeResponse

      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data.id).toBeDefined()
      expect(body.data.matchScore).toBe(75)
      expect(body.data.matchTier).toBe('strong')  // 75 >= 70
      expect(body.data.fieldErrors).toBeUndefined() // not present on success
    })

    it('does not call analyzeResume when validation fails', async () => {
      await POST(makeRequest({ resumeText: 'too short', jobDescription: VALID_JD }))

      // The AI function must never be called — saves API cost, prevents noise
      expect(analyzeResume).not.toHaveBeenCalled()
    })

  })

  // ── HTTP method guards ─────────────────────────────────────────────────────

  describe('HTTP method guards', () => {

    it('returns 405 for GET requests', async () => {
      const { GET } = await import('@/app/api/analyze/route')
      const res     = await GET()
      const body    = await res.json() as AnalyzeErrorResponse

      expect(res.status).toBe(405)
      expect(body.code).toBe('INTERNAL_ERROR')
    })

  })

})
