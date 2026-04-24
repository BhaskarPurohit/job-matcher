'use client'

import { AlertTriangle, TrendingUp, CheckCircle2, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NextStepsBannerProps {
  score: number
  skillGaps: Array<{ name: string; importance: string }>
  topSuggestion: string
}

type Tier = 'low' | 'mid' | 'high'

function getTier(score: number): Tier {
  if (score < 40) return 'low'
  if (score <= 70) return 'mid'
  return 'high'
}

const TIER_STYLES: Record<Tier, { wrapper: string; icon: string; badge: string }> = {
  low: {
    wrapper: 'border-danger/30 bg-danger-dim',
    icon: 'text-danger',
    badge: 'bg-danger/10 text-danger border-danger/20',
  },
  mid: {
    wrapper: 'border-warning/30 bg-warning-dim',
    icon: 'text-warning',
    badge: 'bg-warning/10 text-warning border-warning/20',
  },
  high: {
    wrapper: 'border-accent/30 bg-accent/5',
    icon: 'text-accent',
    badge: 'bg-accent/10 text-accent border-accent/20',
  },
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function ActionStep({
  index,
  children,
  badgeClass,
}: {
  index: number
  children: React.ReactNode
  badgeClass: string
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className={cn('text-[10px] font-mono border rounded px-1.5 py-0.5 shrink-0 mt-0.5', badgeClass)}>
        {String(index).padStart(2, '0')}
      </span>
      <p className="text-sm text-zinc-200 leading-relaxed">{children}</p>
    </div>
  )
}

function InlineButton({
  onClick,
  children,
}: {
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 font-semibold text-zinc-100 underline underline-offset-2 hover:no-underline hover:opacity-80 transition-opacity"
    >
      {children}
      <ArrowRight className="w-3 h-3 shrink-0" />
    </button>
  )
}

export function NextStepsBanner({ score, skillGaps, topSuggestion }: NextStepsBannerProps) {
  const tier = getTier(score)
  const styles = TIER_STYLES[tier]
  const topRequired = skillGaps.find((s) => s.importance === 'required') ?? skillGaps[0]

  return (
    <div className={cn('rounded-xl border p-5 space-y-4', styles.wrapper)}>
      {/* Header */}
      <div className="flex items-center gap-2.5">
        {tier === 'low' && <AlertTriangle className={cn('w-4 h-4 shrink-0', styles.icon)} />}
        {tier === 'mid' && <TrendingUp className={cn('w-4 h-4 shrink-0', styles.icon)} />}
        {tier === 'high' && <CheckCircle2 className={cn('w-4 h-4 shrink-0', styles.icon)} />}
        <h3 className="text-sm font-semibold text-zinc-100">
          {tier === 'low' && 'Your match is low — start here'}
          {tier === 'mid' && 'Good foundation — here\'s how to improve'}
          {tier === 'high' && 'Strong match — one final step'}
        </h3>
      </div>

      {/* Action steps */}
      <div className="space-y-3 pl-0.5">
        {tier === 'low' && (
          <>
            <ActionStep index={1} badgeClass={styles.badge}>
              <InlineButton onClick={() => scrollTo('tailored-summary')}>
                Rewrite your summary
              </InlineButton>{' '}
              using the tailored version below — it&apos;s already optimized for this role.
            </ActionStep>
            {topRequired && (
              <ActionStep index={2} badgeClass={styles.badge}>
                Add <span className="font-semibold text-zinc-100">{topRequired.name}</span> to your
                Skills section — it&apos;s a required keyword missing from your resume.
              </ActionStep>
            )}
          </>
        )}

        {tier === 'mid' && (
          <>
            {topRequired ? (
              <ActionStep index={1} badgeClass={styles.badge}>
                <span className="font-semibold text-zinc-100">{topRequired.name}</span> is listed as{' '}
                <span className="font-semibold text-zinc-100">Required</span> — add a project or
                bullet point that demonstrates it to close your biggest gap.
              </ActionStep>
            ) : (
              <ActionStep index={1} badgeClass={styles.badge}>
                {topSuggestion}
              </ActionStep>
            )}
            <ActionStep index={2} badgeClass={styles.badge}>
              <InlineButton onClick={() => scrollTo('tailored-summary')}>
                Swap in the tailored summary
              </InlineButton>{' '}
              below to improve ATS keyword density.
            </ActionStep>
          </>
        )}

        {tier === 'high' && (
          <ActionStep index={1} badgeClass={styles.badge}>
            Before applying,{' '}
            <InlineButton onClick={() => scrollTo('tailored-summary')}>
              use the tailored summary
            </InlineButton>{' '}
            as the opening paragraph of your cover letter — it&apos;s already scoped to this role.
          </ActionStep>
        )}
      </div>
    </div>
  )
}
