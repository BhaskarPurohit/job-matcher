import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { listAnalysesByUser } from '@/lib/data/analyses'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { TrendingUp, FileSearch, AlertCircle, ArrowRight, ExternalLink, PlusCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Analysis, MatchTier } from '@/types/analysis'

const SCORE_BADGE: Record<MatchTier, string> = {
  strong:   'bg-accent-dim text-accent border-accent/20',
  moderate: 'bg-warning-dim text-warning border-warning/20',
  weak:     'bg-danger-dim text-danger border-danger/20',
}

function ScoreBadge({ score, tier }: { score: number; tier: MatchTier }) {
  return (
    <Badge
      className={cn('font-mono text-xs border px-2 py-0.5 font-bold', SCORE_BADGE[tier])}
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      {score}
    </Badge>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function computeStats(analyses: Analysis[]) {
  const total = analyses.length
  if (total === 0) return { total, avg: 0, topGap: null }

  const avg = Math.round(analyses.reduce((s, a) => s + a.matchScore, 0) / total)

  const gapCount: Record<string, number> = {}
  for (const a of analyses) {
    for (const skill of a.missingSkills) {
      gapCount[skill.name] = (gapCount[skill.name] ?? 0) + 1
    }
  }
  const topGap = Object.entries(gapCount).sort((a, b) => b[1] - a[1])[0] ?? null

  return { total, avg, topGap }
}

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const analyses = user ? await listAnalysesByUser(user.id) : []
  const recent = analyses.slice(0, 5)
  const { total, avg, topGap } = computeStats(analyses)

  const firstName = user?.user_metadata?.full_name?.split(' ')[0]
    ?? user?.email?.split('@')[0]
    ?? 'there'

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const stats = [
    { label: 'Total Analyses', value: String(total),    sub: total === 0 ? 'Run your first analysis' : `${total} on record`,    icon: FileSearch,  positive: true  },
    { label: 'Avg Match Score', value: avg ? String(avg) : '—', sub: avg ? `Across all analyses` : 'No data yet',              icon: TrendingUp,  positive: true  },
    { label: 'Top Skill Gap',  value: topGap?.[0] ?? '—',       sub: topGap ? `Missing in ${topGap[1]} ${topGap[1] === 1 ? 'analysis' : 'analyses'}` : 'No gaps found', icon: AlertCircle, positive: false },
  ]

  return (
    <>
      <div className="h-14 border-b border-border flex items-center justify-between px-8">
        <div />
        <Button size="sm" className="bg-accent hover:bg-accent-hover text-black font-semibold h-8 text-xs" asChild>
          <Link href="/analyze">
            <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
            New Analysis
          </Link>
        </Button>
      </div>

      <div className="p-8 space-y-8">
        {/* Greeting + CTA */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-normal text-zinc-100 leading-tight" style={{ fontFamily: "'DM Serif Display', serif" }}>
              {greeting}, {firstName}
            </h1>
            <p className="text-sm text-muted mt-1">
              {total === 0
                ? 'Run your first analysis to get started.'
                : <>You have <span className="text-zinc-100 font-medium">{total} {total === 1 ? 'analysis' : 'analyses'}</span> on record.</>}
            </p>
          </div>

          <Card className="bg-surface border-accent/20 shrink-0 w-72">
            <CardContent className="p-5">
              <p className="text-xs text-muted mb-1">Ready to apply?</p>
              <p className="text-sm text-zinc-100 font-medium mb-4">Analyze a new job opening now</p>
              <Button size="sm" className="w-full bg-accent hover:bg-accent-hover text-black font-semibold text-xs h-8" asChild>
                <Link href="/analyze">
                  Start Analysis
                  <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="bg-surface border-border hover:border-border-hover transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs text-muted font-medium">{stat.label}</span>
                  <div className="w-7 h-7 bg-bg border border-border rounded-md flex items-center justify-center">
                    <stat.icon className="w-3.5 h-3.5 text-muted" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-zinc-100 font-mono" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {stat.value}
                </div>
                <p className={cn('text-xs mt-1 font-mono', stat.positive ? 'text-accent' : 'text-warning')} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {stat.sub}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent analyses */}
        {recent.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-100">Recent Analyses</h2>
              <Link href="/history" className="text-xs text-muted hover:text-accent transition-colors flex items-center gap-1">
                View all
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            <Card className="bg-surface border-border">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted text-xs font-medium uppercase tracking-wider pl-5">Job Title</TableHead>
                    <TableHead className="text-muted text-xs font-medium uppercase tracking-wider">Company</TableHead>
                    <TableHead className="text-muted text-xs font-medium uppercase tracking-wider">Score</TableHead>
                    <TableHead className="text-muted text-xs font-medium uppercase tracking-wider">Date</TableHead>
                    <TableHead className="text-muted text-xs font-medium uppercase tracking-wider pr-5 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map((analysis) => (
                    <TableRow key={analysis.id} className="border-border hover:bg-surface-hover transition-colors">
                      <TableCell className="pl-5 py-3.5 text-sm font-medium text-zinc-100">{analysis.jobTitle}</TableCell>
                      <TableCell className="py-3.5 text-sm text-muted">{analysis.companyName ?? '—'}</TableCell>
                      <TableCell className="py-3.5">
                        <ScoreBadge score={analysis.matchScore} tier={analysis.matchTier} />
                      </TableCell>
                      <TableCell className="py-3.5 text-sm text-muted font-mono text-xs" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {formatDate(analysis.createdAt)}
                      </TableCell>
                      <TableCell className="py-3.5 pr-5 text-right">
                        <Button variant="ghost" size="sm" className="h-7 px-3 text-xs text-muted hover:text-zinc-100 hover:bg-border" asChild>
                          <Link href={`/analysis/${analysis.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}

        {/* Empty state */}
        {total === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 bg-surface border border-border rounded-2xl flex items-center justify-center mb-5">
              <FileSearch className="w-6 h-6 text-muted" />
            </div>
            <h3 className="text-base font-semibold text-zinc-100 mb-2">No analyses yet</h3>
            <p className="text-sm text-muted mb-6 max-w-xs leading-relaxed">
              Paste your resume and a job description to see your match score and skill gaps.
            </p>
            <Button size="sm" className="bg-accent hover:bg-accent-hover text-black font-semibold gap-2" asChild>
              <Link href="/analyze">
                Start your first analysis
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </>
  )
}
