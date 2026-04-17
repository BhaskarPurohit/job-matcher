// Global test setup — runs before every test file.
//
// We mock the AI module here rather than in each test file so that:
//   1. No test file ever accidentally makes a real OpenAI API call
//   2. Tests stay fast and deterministic
//   3. A missing OPENAI_API_KEY never breaks the test suite
//
// The mock is defined at the module level. Individual tests can override
// the resolved value with vi.mocked(...).mockResolvedValueOnce() when they
// need to test a specific AI response or error path.

import { vi } from 'vitest'

vi.mock('@/lib/ai/analyze', () => ({
  analyzeResume: vi.fn(),
  AIAnalysisError: class AIAnalysisError extends Error {
    constructor(message: string, public cause?: unknown) {
      super(message)
      this.name = 'AIAnalysisError'
    }
  },
}))
