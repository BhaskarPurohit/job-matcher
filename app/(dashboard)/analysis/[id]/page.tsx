// Server component — no "use client" directive.
// Data is fetched at request time; only interactive islands are client components.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { ArrowLeft, Download, Zap, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScoreRing } from '@/components/analysis/ScoreRing'
import { CopyButton } from '@/components/analysis/CopyButton'
import { StrengthsList } from '@/components/analysis/StrengthsList'
import { getAnalysisById } from '@/lib/data/analyses'
import type { Analysis, MatchTier, SkillImportance } from '@/types/analysis'

// ── Visual config maps (static — no reason to be in state or a hook) ─────────

const TIER_CONFIG: Record<MatchTier, { label: string; className: string }> = {
  strong: {
    label: 'Strong Match',
    className: 'bg-accent-dim text-accent border-accent/20',
  },
  moderate: {
    label: 'Moderate Match',
    className: 'bg-warning-dim text-warning border-warning/20',
  },
  weak: {
    label: 'Weak Match',
    className: 'bg-danger-dim text-danger border-danger/20',
  },
}

const IMPORTANCE_CONFIG: Record<
  SkillImportance,
  { label: string; className: string }
> = {
  required: {
    label: 'Required',
    className: 'bg-danger-dim text-danger border-danger/20',
  },
  preferred: {
    label: 'Preferred',
    className: 'bg-warning-dim text-warning border-warning/20',
  },
  'nice-to-have': {
    label: 'Nice to have',
    className: 'bg-muted/10 text-muted border-muted/20',
  },
}

// ── Sub-components (server-safe, no hooks) ────────────────────────────────────

function SkillsCard({ analysis }: { analysis: Analysis }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Present skills */}
      <Card className="bg-surface border-border">
        <CardHeader className="pb-3 pt-5 px-5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent" />
            <h2 className="text-sm font-semibold text-zinc-100">Present Skills</h2>
            <span className="text-xs font-mono text-muted ml-auto">
              {analysis.presentSkills.length} found
            </span>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="p-5 pt-4">
          <div className="flex flex-wrap gap-2">
            {analysis.presentSkills.map((skill) => (
              <Badge
                key={skill.name}
                className="bg-accent-dim text-accent border border-accent/20 text-xs font-mono px-2.5 py-1"
              >
                {skill.name}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Missing skills */}
      <Card className="bg-surface border-border">
        <CardHeader className="pb-3 pt-5 px-5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-danger" />
            <h2 className="text-sm font-semibold text-zinc-100">Missing Skills</h2>
            <span className="text-xs font-mono text-muted ml-auto">
              {analysis.missingSkills.length} gaps
            </span>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="p-5 pt-4">
          <div className="flex flex-col gap-2">
            {analysis.missingSkills.map((skill) => {
              const cfg = IMPORTANCE_CONFIG[skill.importance]
              return (
                <div key={skill.name} className="flex items-center justify-between">
                  <span className="text-sm text-zinc-100">{skill.name}</span>
                  <Badge
                    className={cn(
                      'text-[10px] font-mono border px-2 py-0.5',
                      cfg.className
                    )}
                  >
                    {cfg.label}
                  </Badge>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SuggestionsCard({ analysis }: { analysis: Analysis }) {
  // Deduplicate by section label — keep the last occurrence of each section
  const seen: Record<string, typeof analysis.suggestions[number]> = {}
  for (const s of analysis.suggestions) seen[s.section] = s
  const suggestions = Object.values(seen)

  return (
    <Card className="bg-surface border-border">
      <CardHeader className="pb-3 pt-5 px-5">
        <h2 className="text-sm font-semibold text-zinc-100">
          Actionable Suggestions
        </h2>
        <p className="text-xs text-muted">
          {suggestions.length} specific improvements to boost your score
        </p>
      </CardHeader>
      <Separator />
      <CardContent className="p-5 pt-2">
        <Accordion type="multiple" defaultValue={['0']} className="space-y-2">
          {suggestions.map((suggestion, i) => {
            const preview = suggestion.suggested.split(/[.!?]/)[0].trim()
            const subtitle = preview.length > 80 ? preview.slice(0, 80) + '…' : preview
            return (
              <AccordionItem
                key={suggestion.section}
                value={String(i)}
                className="border border-border rounded-lg overflow-hidden data-[state=open]:border-accent/20"
              >
                <AccordionTrigger className="px-4 py-3 hover:bg-surface-hover transition-colors hover:no-underline text-left">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-[10px] font-mono text-muted bg-bg border border-border rounded px-1.5 py-0.5 shrink-0">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-zinc-100 block">
                        {suggestion.section}
                      </span>
                      <span className="text-xs text-muted truncate block max-w-xs sm:max-w-sm">
                        {subtitle}
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="px-4 pb-4 space-y-3">
                    <Separator />
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted font-medium uppercase tracking-wider">
                        Suggestion
                      </p>
                      <p className="text-sm text-zinc-100 leading-relaxed">
                        {suggestion.suggested}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted font-medium uppercase tracking-wider">
                        Reasoning
                      </p>
                      <p className="text-sm text-muted leading-relaxed">
                        {suggestion.reasoning}
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      </CardContent>
    </Card>
  )
}

// ── Page (async server component) ────────────────────────────────────────────

export default async function AnalysisResultPage({
  params,
}: {
  params: { id: string }
}) {
  const analysis = await getAnalysisById(params.id)

  // Next.js renders the nearest not-found.tsx (or its default 404 page)
  if (!analysis) notFound()

  const tierConfig = TIER_CONFIG[analysis.matchTier]
  const formattedDate = new Date(analysis.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <>
      {/* Top bar */}
      <div className="h-14 border-b border-border flex items-center justify-between px-8">
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
        <span className="text-xs font-mono text-muted">{formattedDate}</span>
      </div>

      <div className="p-8 space-y-6 max-w-5xl">
        {/* Hero — score ring */}
        <Card className="bg-surface border-border">
          <CardContent className="p-8 flex flex-col items-center text-center">
            <p className="text-xs text-muted font-mono mb-1 uppercase tracking-widest">
              Match Score
            </p>
            <h1
              className="text-xl font-normal text-zinc-100 mb-2 font-display"
            >
              {analysis.jobTitle}
              {analysis.companyName ? ` at ${analysis.companyName}` : ''}
            </h1>
            <Badge
              className={cn(
                'text-xs font-mono border mb-6 px-3 py-1',
                tierConfig.className
              )}
            >
              {tierConfig.label}
            </Badge>

            <ScoreRing score={analysis.matchScore} size={200} strokeWidth={10} />

            <p className="text-sm text-muted mt-5 max-w-sm">
              Your resume matches{' '}
              <span className="text-zinc-100 font-medium">{analysis.matchScore}%</span>{' '}
              of the requirements for this role.
            </p>
          </CardContent>
        </Card>

        {/* Skills */}
        <SkillsCard analysis={analysis} />

        {/* Strengths */}
        <StrengthsList strengths={analysis.strengths} />

        {/* Tailored summary */}
        <Card className="bg-surface border-border">
          <CardHeader className="pb-3 pt-5 px-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <Zap className="w-4 h-4 text-accent" />
                Tailored Summary
              </h2>
              {/* CopyButton is "use client" — it's the only interactive island */}
              <CopyButton text={analysis.tailoredSummary} />
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="p-5 pt-4">
            <p className="text-sm text-zinc-300 leading-relaxed">
              {analysis.tailoredSummary}
            </p>
            <p className="text-xs text-muted mt-3">
              Paste this directly into the Summary section of your resume.
            </p>
          </CardContent>
        </Card>

        {/* Suggestions */}
        <SuggestionsCard analysis={analysis} />

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            variant="outline"
            className="border-border bg-transparent text-zinc-300 hover:bg-surface hover:text-zinc-100 gap-2"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </Button>
          <Button
            className="bg-accent hover:bg-accent-hover text-black font-semibold gap-2"
            asChild
          >
            <Link href="/analyze">
              New Analysis
              <ChevronRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </>
  )
}
