'use client'

// "use client" is required — error boundaries must be Client Components.
// This file catches errors thrown during:
//   - Server component rendering (page.tsx fetch failures)
//   - Any unhandled promise rejection in the route segment
//
// notFound() does NOT trigger this — it renders not-found.tsx instead.
// HTTP errors from fetch (4xx/5xx) DO trigger this if you throw them.

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw, ArrowLeft, FileSearch } from 'lucide-react'

// Map error conditions to user-facing copy.
// Never expose raw error.message — it may contain internal details.
function getErrorDetails(error: Error & { digest?: string }): {
  title: string
  description: string
  showReset: boolean
} {
  const msg = error.message?.toLowerCase() ?? ''

  if (msg.includes('network') || msg.includes('fetch')) {
    return {
      title: 'Connection error',
      description: 'Could not reach the server. Check your connection and try again.',
      showReset: true,
    }
  }

  if (msg.includes('timeout')) {
    return {
      title: 'Request timed out',
      description: 'The analysis took too long to load. Please try again.',
      showReset: true,
    }
  }

  if (msg.includes('unauthorized') || msg.includes('403')) {
    return {
      title: 'Access denied',
      description: "You don't have permission to view this analysis.",
      showReset: false,
    }
  }

  // Default — safe, non-technical
  return {
    title: 'Failed to load analysis',
    description: 'Something went wrong on our end. Please try again.',
    showReset: true,
  }
}

export default function AnalysisError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Log to your error tracking service (Sentry, Datadog, etc.) here.
  // digest is Next.js's server-side error ID — useful for correlating logs.
  useEffect(() => {
    console.error('[AnalysisError]', {
      message: error.message,
      digest: error.digest,
    })
    // Example: Sentry.captureException(error, { extra: { digest: error.digest } })
  }, [error])

  const { title, description, showReset } = getErrorDetails(error)

  return (
    <>
      {/* Top bar — matches real page structure so layout doesn't jump */}
      <div className="h-14 border-b border-border flex items-center px-8">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-3 text-xs text-muted hover:text-zinc-100 hover:bg-surface gap-1.5"
          asChild
        >
          <Link href="/history">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to History
          </Link>
        </Button>
      </div>

      {/* Error body */}
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-8 text-center">
        {/* Icon */}
        <div className="w-14 h-14 bg-danger-dim border border-danger/20 rounded-2xl flex items-center justify-center mb-5">
          <AlertCircle className="w-6 h-6 text-danger" />
        </div>

        {/* Copy */}
        <h1 className="text-base font-semibold text-zinc-100 mb-2">{title}</h1>
        <p className="text-sm text-muted max-w-xs leading-relaxed mb-6">
          {description}
        </p>

        {/* Digest — visible only in dev, helps correlate server logs */}
        {process.env.NODE_ENV === 'development' && error.digest && (
          <p className="text-[11px] font-mono text-muted/60 bg-surface border border-border rounded px-2 py-1 mb-6">
            digest: {error.digest}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          {showReset && (
            <Button
              size="sm"
              variant="outline"
              className="border-border bg-transparent text-zinc-300 hover:bg-surface hover:text-zinc-100 gap-2"
              onClick={reset}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try again
            </Button>
          )}
          <Button
            size="sm"
            className="bg-accent hover:bg-accent-hover text-black font-semibold gap-2"
            asChild
          >
            <Link href="/history">
              <FileSearch className="w-3.5 h-3.5" />
              View all analyses
            </Link>
          </Button>
        </div>
      </div>
    </>
  )
}
