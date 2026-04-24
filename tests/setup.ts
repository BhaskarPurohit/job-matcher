// Global test setup — runs before every test file.
//
// We mock the AI module here so no test ever makes a real Anthropic API call.
// Individual tests override the resolved value with mockResolvedValueOnce().

import { vi } from 'vitest'

// Mock the new AI analyzer (hybrid pipeline)
vi.mock('@/lib/scoring/aiAnalyzer', () => ({
  runAIAnalysis: vi.fn(),
  PRIORITY_MAP: {
    high:   'required',
    medium: 'preferred',
    low:    'nice-to-have',
  },
}))

// Keep old module mock in case any other tests still import it
vi.mock('@/lib/ai/analyze', () => ({
  analyzeResume: vi.fn(),
  AIAnalysisError: class AIAnalysisError extends Error {
    constructor(message: string, public cause?: unknown) {
      super(message)
      this.name = 'AIAnalysisError'
    }
  },
}))
