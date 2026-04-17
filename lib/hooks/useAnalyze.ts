'use client'

import { useState } from 'react'
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  AnalyzeErrorResponse,
  FieldError,
} from '@/types/analysis'

type AnalyzeState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: AnalyzeResponse['data'] }
  | {
      status: 'error'
      error: string
      code: AnalyzeErrorResponse['code']
      fieldErrors: FieldError[]   // empty [] for non-validation errors
    }

export function useAnalyze() {
  const [state, setState] = useState<AnalyzeState>({ status: 'idle' })

  async function analyze(input: AnalyzeRequest) {
    setState({ status: 'loading' })

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      const json: AnalyzeResponse | AnalyzeErrorResponse = await res.json()

      if (!json.success) {
        const errJson = json as AnalyzeErrorResponse
        setState({
          status: 'error',
          error: errJson.error,
          code: errJson.code,
          fieldErrors: errJson.fieldErrors,
        })
        return null
      }

      setState({ status: 'success', data: json.data })
      return json.data  // caller: router.push(`/analysis/${json.data.id}`)
    } catch (err) {
      setState({
        status: 'error',
        error: err instanceof Error ? err.message : 'Network error',
        code: 'INTERNAL_ERROR',
        fieldErrors: [],
      })
      return null
    }
  }

  // Convenience: look up the error for a specific field name.
  // Use in form components: const err = fieldError('resumeText')
  function fieldError(field: string): string | undefined {
    if (state.status !== 'error') return undefined
    return state.fieldErrors.find((e) => e.field === field)?.message
  }

  function reset() {
    setState({ status: 'idle' })
  }

  return { state, analyze, fieldError, reset }
}
