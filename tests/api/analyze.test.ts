/**
 * tests/api/analyze.test.ts
 *
 * Tests for POST /api/analyze — validation layer only.
 * The AI call is mocked; no real network requests are made.
 *
 * Strategy: call the exported POST handler directly (unit style).
 * We don't need a running server — Next.js route handlers are plain async functions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/analyze/route'
import { runAIAnalysis } from '@/lib/scoring/aiAnalyzer'
import type { AnalyzeErrorResponse, AnalyzeResponse } from '@/types/analysis'
import type { AIAnalyzerResponse } from '@/lib/scoring/aiAnalyzer'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const VALID_RESUME = 'a'.repeat(100)
const VALID_JD     = 'b'.repeat(50)

const MOCK_AI_RESPONSE: AIAnalyzerResponse = {
  result: {
    aiScore:         75,
    presentSkills:   ['TypeScript'],
    missingSkills:   [{ skill: 'Rust', priority: 'high' }],
    keyStrengths:    ['Strong React fundamentals'],
    tailoredSummary: 'Experienced frontend engineer with TypeScript expertise.',
    suggestions:     [{
      section:        'Experience',
      recommendation: 'Quantify performance improvements.',
    }],
    atsKeywords:     ['TypeScript', 'React'],
  },
  promptTokens:     200,
  completionTokens: 400,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/analyze', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('POST /api/analyze', () => {

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Validation: resumeText ─────────────────────────────────────────────────

  describe('resumeText validation', () => {

    it('returns 400 when resumeText is missing', async () => {
      const res  = await POST(makeRequest({ jobDescription: VALID_JD }))
      const body = await res.json() as AnalyzeErrorResponse

      expect(res.status).toBe(400)
      expect(body.success).toBe(false)
      expect(body.code).toBe('VALIDATION_ERROR')
      expect(body.fieldErrors.some((e) => e.field === 'resumeText')).toBe(true)
    })

    it('returns 400 when resumeText is too short (< 100 chars)', async () => {
      const res  = await POST(makeRequest({ resumeText: 'a'.repeat(99), jobDescription: VALID_JD }))
      const body = await res.json() as AnalyzeErrorResponse

      expect(res.status).toBe(400)
      expect(body.code).toBe('VALIDATION_ERROR')
      const err = body.fieldErrors.find((e) => e.field === 'resumeText')
      expect(err).toBeDefined()
      expect(err?.message).toMatch(/too short/i)
    })

    it('returns 400 when resumeText is exactly 99 chars', async () => {
      const res  = await POST(makeRequest({ resumeText: 'x'.repeat(99), jobDescription: VALID_JD }))
      expect((await res.json() as AnalyzeErrorResponse).code).toBe('VALIDATION_ERROR')
    })

    it('returns 400 when resumeText is only whitespace', async () => {
      const res  = await POST(makeRequest({ resumeText: ' '.repeat(100), jobDescription: VALID_JD }))
      const body = await res.json() as AnalyzeErrorResponse

      expect(res.status).toBe(400)
      const err = body.fieldErrors.find((e) => e.field === 'resumeText')
      expect(err?.message).toMatch(/whitespace/i)
    })

    it('returns 400 when resumeText exceeds 15,000 chars', async () => {
      const res  = await POST(makeRequest({ resumeText: 'a'.repeat(15_001), jobDescription: VALID_JD }))
      const body = await res.json() as AnalyzeErrorResponse

      expect(res.status).toBe(400)
      const err = body.fieldErrors.find((e) => e.field === 'resumeText')
      expect(err?.message).toMatch(/15,000/i)
    })

    it('accepts resumeText at exactly 100 chars (boundary)', async () => {
      vi.mocked(runAIAnalysis).mockResolvedValueOnce(MOCK_AI_RESPONSE)

      const res  = await POST(makeRequest({ resumeText: 'a'.repeat(100), jobDescription: VALID_JD }))
      const body = await res.json() as AnalyzeResponse

      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
    })

  })

  // ── Validation: jobDescription ────────────────────────────────────────────

  describe('jobDescription validation', () => {

    it('returns 400 when jobDescription is missing', async () => {
      const res  = await POST(makeRequest({ resumeText: VALID_RESUME }))
      const body = await res.json() as AnalyzeErrorResponse

      expect(res.status).toBe(400)
      expect(body.fieldErrors.some((e) => e.field === 'jobDescription')).toBe(true)
    })

    it('returns 400 when jobDescription is too short (< 50 chars)', async () => {
      const res  = await POST(makeRequest({ resumeText: VALID_RESUME, jobDescription: 'b'.repeat(49) }))
      const body = await res.json() as AnalyzeErrorResponse

      expect(res.status).toBe(400)
      const err = body.fieldErrors.find((e) => e.field === 'jobDescription')
      expect(err).toBeDefined()
      expect(err?.message).toMatch(/too short/i)
    })

    it('returns 400 when jobDescription is only whitespace', async () => {
      const res  = await POST(makeRequest({ resumeText: VALID_RESUME, jobDescription: ' '.repeat(50) }))
      const body = await res.json() as AnalyzeErrorResponse

      expect(res.status).toBe(400)
      const err = body.fieldErrors.find((e) => e.field === 'jobDescription')
      expect(err?.message).toMatch(/whitespace/i)
    })

  })

  // ── Multiple field errors ────────────────────────────────────────────────

  describe('multiple field errors', () => {

    it('returns errors for both fields when both are invalid', async () => {
      const res  = await POST(makeRequest({ resumeText: 'too short', jobDescription: 'also short' }))
      const body = await res.json() as AnalyzeErrorResponse

      expect(res.status).toBe(400)
      expect(body.fieldErrors.length).toBeGreaterThanOrEqual(2)
      const fields = body.fieldErrors.map((e) => e.field)
      expect(fields).toContain('resumeText')
      expect(fields).toContain('jobDescription')
    })

    it('fieldErrors is always an array, even for non-validation errors', async () => {
      const res  = await POST(makeRequest({ resumeText: 'too short', jobDescription: VALID_JD }))
      const body = await res.json() as AnalyzeErrorResponse
      expect(Array.isArray(body.fieldErrors)).toBe(true)
    })

  })

  // ── Malformed request body ────────────────────────────────────────────────

  describe('malformed requests', () => {

    it('returns 400 when body is not valid JSON', async () => {
      const req  = new NextRequest('http://localhost/api/analyze', {
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

  // ── Success path ─────────────────────────────────────────────────────────

  describe('success path', () => {

    it('returns 200 with composite score data when inputs are valid', async () => {
      vi.mocked(runAIAnalysis).mockResolvedValueOnce(MOCK_AI_RESPONSE)

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
      expect(body.data.matchScore).toBeGreaterThanOrEqual(0)
      expect(body.data.matchScore).toBeLessThanOrEqual(100)
      expect(['strong','moderate','weak']).toContain(body.data.matchTier)
      expect(body.data.scoreBreakdown).toBeDefined()
      expect(body.data.scoreBreakdown?.methodology).toMatch(/40%/)
      // fieldErrors must not appear on the success shape
      expect((body.data as unknown as Record<string, unknown>).fieldErrors).toBeUndefined()
    })

    it('does not call runAIAnalysis when validation fails', async () => {
      await POST(makeRequest({ resumeText: 'too short', jobDescription: VALID_JD }))
      expect(runAIAnalysis).not.toHaveBeenCalled()
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
