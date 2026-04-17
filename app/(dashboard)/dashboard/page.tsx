// FILE: app/(dashboard)/page.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingUp,
  FileSearch,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  PlusCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Mock data ---
const MOCK_ANALYSES = [
  {
    id: "a1",
    jobTitle: "Senior Frontend Engineer",
    company: "Stripe",
    score: 82,
    date: "Apr 14, 2026",
    tier: "strong",
  },
  {
    id: "a2",
    jobTitle: "Staff Software Engineer",
    company: "Linear",
    score: 67,
    date: "Apr 12, 2026",
    tier: "moderate",
  },
  {
    id: "a3",
    jobTitle: "Principal Engineer",
    company: "Vercel",
    score: 74,
    date: "Apr 10, 2026",
    tier: "strong",
  },
  {
    id: "a4",
    jobTitle: "Engineering Manager",
    company: "Notion",
    score: 38,
    date: "Apr 08, 2026",
    tier: "weak",
  },
  {
    id: "a5",
    jobTitle: "Frontend Architect",
    company: "Figma",
    score: 91,
    date: "Apr 06, 2026",
    tier: "strong",
  },
];

const STATS = [
  {
    label: "Total Analyses",
    value: "24",
    sub: "+3 this week",
    icon: FileSearch,
    positive: true,
  },
  {
    label: "Avg Match Score",
    value: "71",
    sub: "+4 vs last month",
    icon: TrendingUp,
    positive: true,
  },
  {
    label: "Top Skill Gap",
    value: "Rust",
    sub: "Missing in 8 analyses",
    icon: AlertCircle,
    positive: false,
  },
];

// ─── ScoreBadge (local; promote to components/analysis/ScoreBadge.tsx when reused elsewhere) ───

function ScoreBadge({ score, tier }: { score: number; tier: string }) {
  const config = {
    strong: "bg-accent-dim text-accent border-accent/20",
    moderate: "bg-warning-dim text-warning border-warning/20",
    weak: "bg-danger-dim text-danger border-danger/20",
  }[tier] ?? "bg-[#71717A]/10 text-muted border-[#71717A]/20";

  return (
    <Badge
      className={cn("font-mono text-xs border px-2 py-0.5 font-bold", config)}
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      {score}
    </Badge>
  );
}

export default function DashboardPage() {
  return (
    // layout.tsx provides the Sidebar + outer flex wrapper
    <>
        {/* Top bar */}
        <div className="h-14 border-b border-border flex items-center justify-between px-8">
          <div />
          <Button
            size="sm"
            className="bg-accent hover:bg-accent-hover text-black font-semibold h-8 text-xs"
            asChild
          >
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
              <h1
                className="text-3xl font-normal text-zinc-100 leading-tight"
                style={{ fontFamily: "'DM Serif Display', serif" }}
              >
                Good morning, Alex
              </h1>
              <p className="text-sm text-muted mt-1">
                You have{" "}
                <span className="text-zinc-100 font-medium">3 analyses</span>{" "}
                this week.
              </p>
            </div>

            {/* Prominent CTA card */}
            <Card className="bg-surface border-accent/20 shrink-0 w-72">
              <CardContent className="p-5">
                <p className="text-xs text-muted mb-1">Ready to apply?</p>
                <p className="text-sm text-zinc-100 font-medium mb-4">
                  Analyze a new job opening now
                </p>
                <Button
                  size="sm"
                  className="w-full bg-accent hover:bg-accent-hover text-black font-semibold text-xs h-8"
                  asChild
                >
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
            {STATS.map((stat) => (
              <Card
                key={stat.label}
                className="bg-surface border-border hover:border-border-hover transition-colors"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs text-muted font-medium">
                      {stat.label}
                    </span>
                    <div className="w-7 h-7 bg-bg border border-border rounded-md flex items-center justify-center">
                      <stat.icon className="w-3.5 h-3.5 text-muted" />
                    </div>
                  </div>
                  <div
                    className="text-3xl font-bold text-zinc-100 font-mono"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {stat.value}
                  </div>
                  <p
                    className={cn(
                      "text-xs mt-1 font-mono",
                      stat.positive ? "text-accent" : "text-warning"
                    )}
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {stat.sub}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recent analyses */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-100">
                Recent Analyses
              </h2>
              <Link
                href="/history"
                className="text-xs text-muted hover:text-accent transition-colors flex items-center gap-1"
              >
                View all
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            <Card className="bg-surface border-border">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted text-xs font-medium uppercase tracking-wider pl-5">
                      Job Title
                    </TableHead>
                    <TableHead className="text-muted text-xs font-medium uppercase tracking-wider">
                      Company
                    </TableHead>
                    <TableHead className="text-muted text-xs font-medium uppercase tracking-wider">
                      Score
                    </TableHead>
                    <TableHead className="text-muted text-xs font-medium uppercase tracking-wider">
                      Date
                    </TableHead>
                    <TableHead className="text-muted text-xs font-medium uppercase tracking-wider pr-5 text-right">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_ANALYSES.map((analysis) => (
                    <TableRow
                      key={analysis.id}
                      className="border-border hover:bg-surface-hover transition-colors"
                    >
                      <TableCell className="pl-5 py-3.5 text-sm font-medium text-zinc-100">
                        {analysis.jobTitle}
                      </TableCell>
                      <TableCell className="py-3.5 text-sm text-muted">
                        {analysis.company}
                      </TableCell>
                      <TableCell className="py-3.5">
                        <ScoreBadge score={analysis.score} tier={analysis.tier} />
                      </TableCell>
                      <TableCell className="py-3.5 text-sm text-muted font-mono text-xs" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {analysis.date}
                      </TableCell>
                      <TableCell className="py-3.5 pr-5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-3 text-xs text-muted hover:text-zinc-100 hover:bg-border"
                          asChild
                        >
                          <Link href={`/analysis/${analysis.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        </div>
    </>
  );
}
