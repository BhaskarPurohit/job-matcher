'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { PlusCircle, Search, Trash2, ExternalLink, FileSearch, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Analysis, MatchTier } from '@/types/analysis'

type Tier = 'all' | MatchTier

const TIER_FILTER_OPTIONS: { value: Tier; label: string; className: string }[] = [
  { value: 'all',      label: 'All',      className: 'border-border text-muted hover:text-zinc-100 data-[active=true]:bg-[#1F1F23] data-[active=true]:text-zinc-100 data-[active=true]:border-border-hover' },
  { value: 'strong',   label: 'Strong',   className: 'border-accent/20 text-muted hover:text-accent data-[active=true]:bg-accent-dim data-[active=true]:text-accent data-[active=true]:border-accent/30' },
  { value: 'moderate', label: 'Moderate', className: 'border-warning/20 text-muted hover:text-warning data-[active=true]:bg-warning-dim data-[active=true]:text-warning data-[active=true]:border-warning/30' },
  { value: 'weak',     label: 'Weak',     className: 'border-danger/20 text-muted hover:text-danger data-[active=true]:bg-danger-dim data-[active=true]:text-danger data-[active=true]:border-[#EF4444]/30' },
]

const SCORE_BADGE: Record<MatchTier, string> = {
  strong:   'bg-accent-dim text-accent border-accent/20',
  moderate: 'bg-warning-dim text-warning border-warning/20',
  weak:     'bg-danger-dim text-danger border-danger/20',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-14 h-14 bg-surface border border-border rounded-2xl flex items-center justify-center mb-5">
        <FileSearch className="w-6 h-6 text-muted" />
      </div>
      <h3 className="text-base font-semibold text-zinc-100 mb-2">No analyses yet</h3>
      <p className="text-sm text-muted mb-6 max-w-xs leading-relaxed">
        Run your first analysis to see how well your resume matches a job description.
      </p>
      <Button size="sm" className="bg-accent hover:bg-accent-hover text-black font-semibold gap-2" asChild>
        <Link href="/analyze">
          Start your first analysis
          <ChevronRight className="w-4 h-4" />
        </Link>
      </Button>
    </div>
  )
}

function NoResults({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 bg-surface border border-border rounded-xl flex items-center justify-center mb-4">
        <Search className="w-5 h-5 text-muted" />
      </div>
      <p className="text-sm text-zinc-100 font-medium mb-1">No results found</p>
      <p className="text-xs text-muted">
        No analyses matching{' '}
        <span className="text-zinc-300 font-mono">"{query}"</span>
      </p>
    </div>
  )
}

export function HistoryClient({ initialAnalyses }: { initialAnalyses: Analysis[] }) {
  const router = useRouter()
  const [analyses, setAnalyses] = useState(initialAnalyses)
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState<Tier>('all')
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      const res = await fetch(`/api/analyses/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setAnalyses((prev) => prev.filter((a) => a.id !== id))
        router.refresh()
      }
    } finally {
      setDeleting(null)
    }
  }

  const filtered = analyses.filter((a) => {
    const matchesSearch =
      search.trim() === '' ||
      a.jobTitle.toLowerCase().includes(search.toLowerCase()) ||
      (a.companyName ?? '').toLowerCase().includes(search.toLowerCase())
    const matchesTier = tierFilter === 'all' || a.matchTier === tierFilter
    return matchesSearch && matchesTier
  })

  const isEmpty = analyses.length === 0

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

      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-normal text-zinc-100" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Analysis History
          </h1>
          <p className="text-sm text-muted mt-1">
            {analyses.length} total {analyses.length === 1 ? 'analysis' : 'analyses'} on record.
          </p>
        </div>

        {isEmpty ? (
          <EmptyState />
        ) : (
          <>
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
                <Input
                  placeholder="Search by title or company..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-surface border-border text-zinc-100 placeholder:text-muted focus-visible:ring-accent/30 focus-visible:border-accent/40 text-sm h-9"
                />
              </div>

              <div className="flex items-center gap-1.5">
                {TIER_FILTER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    data-active={tierFilter === opt.value}
                    onClick={() => setTierFilter(opt.value)}
                    className={cn('h-9 px-3.5 rounded-lg border text-xs font-medium transition-all', opt.className)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <NoResults query={search} />
            ) : (
              <Card className="bg-surface border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted text-xs font-medium uppercase tracking-wider pl-5">Date</TableHead>
                      <TableHead className="text-muted text-xs font-medium uppercase tracking-wider">Job Title</TableHead>
                      <TableHead className="text-muted text-xs font-medium uppercase tracking-wider">Company</TableHead>
                      <TableHead className="text-muted text-xs font-medium uppercase tracking-wider">Score</TableHead>
                      <TableHead className="text-muted text-xs font-medium uppercase tracking-wider pr-5 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((analysis) => (
                      <TableRow key={analysis.id} className="border-border hover:bg-surface-hover transition-colors group">
                        <TableCell className="pl-5 py-3.5 text-xs font-mono text-muted" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {formatDate(analysis.createdAt)}
                        </TableCell>
                        <TableCell className="py-3.5 text-sm font-medium text-zinc-100">{analysis.jobTitle}</TableCell>
                        <TableCell className="py-3.5 text-sm text-muted">{analysis.companyName ?? '—'}</TableCell>
                        <TableCell className="py-3.5">
                          <Badge
                            className={cn('font-mono text-xs border px-2.5 py-0.5 font-bold', SCORE_BADGE[analysis.matchTier])}
                            style={{ fontFamily: "'JetBrains Mono', monospace" }}
                          >
                            {analysis.matchScore}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3.5 pr-5">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="sm" className="h-7 px-3 text-xs text-muted hover:text-zinc-100 hover:bg-border gap-1" asChild>
                              <Link href={`/analysis/${analysis.id}`}>
                                <ExternalLink className="w-3 h-3" />
                                View
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(analysis.id)}
                              disabled={deleting === analysis.id}
                              className="h-7 w-7 p-0 text-muted hover:text-danger hover:bg-danger-dim"
                              aria-label="Delete analysis"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <Separator className="bg-[#1F1F23]" />
                <div className="px-5 py-3 flex items-center justify-between">
                  <span className="text-xs font-mono text-muted" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Showing {filtered.length} of {analyses.length}
                  </span>
                  {filtered.length !== analyses.length && (
                    <button
                      onClick={() => { setSearch(''); setTierFilter('all') }}
                      className="text-xs text-muted hover:text-zinc-100 transition-colors"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </>
  )
}
