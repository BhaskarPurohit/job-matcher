// FILE: app/(dashboard)/history/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PlusCircle,
  Search,
  Trash2,
  ExternalLink,
  FileSearch,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Mock data ---
const ALL_ANALYSES = [
  {
    id: "a1",
    jobTitle: "Senior Frontend Engineer",
    company: "Stripe",
    score: 82,
    tier: "strong",
    date: "Apr 14, 2026",
  },
  {
    id: "a2",
    jobTitle: "Staff Software Engineer",
    company: "Linear",
    score: 67,
    tier: "moderate",
    date: "Apr 12, 2026",
  },
  {
    id: "a3",
    jobTitle: "Principal Engineer",
    company: "Vercel",
    score: 74,
    tier: "strong",
    date: "Apr 10, 2026",
  },
  {
    id: "a4",
    jobTitle: "Engineering Manager",
    company: "Notion",
    score: 38,
    tier: "weak",
    date: "Apr 08, 2026",
  },
  {
    id: "a5",
    jobTitle: "Frontend Architect",
    company: "Figma",
    score: 91,
    tier: "strong",
    date: "Apr 06, 2026",
  },
  {
    id: "a6",
    jobTitle: "React Developer",
    company: "Shopify",
    score: 55,
    tier: "moderate",
    date: "Apr 04, 2026",
  },
  {
    id: "a7",
    jobTitle: "UI Engineer",
    company: "Airbnb",
    score: 29,
    tier: "weak",
    date: "Mar 31, 2026",
  },
  {
    id: "a8",
    jobTitle: "Product Engineer",
    company: "Loom",
    score: 78,
    tier: "strong",
    date: "Mar 28, 2026",
  },
];

type Tier = "all" | "strong" | "moderate" | "weak";

const TIER_FILTER_OPTIONS: { value: Tier; label: string; className: string }[] =
  [
    {
      value: "all",
      label: "All",
      className:
        "border-border text-muted hover:text-zinc-100 data-[active=true]:bg-[#1F1F23] data-[active=true]:text-zinc-100 data-[active=true]:border-border-hover",
    },
    {
      value: "strong",
      label: "Strong",
      className:
        "border-accent/20 text-muted hover:text-accent data-[active=true]:bg-accent-dim data-[active=true]:text-accent data-[active=true]:border-accent/30",
    },
    {
      value: "moderate",
      label: "Moderate",
      className:
        "border-warning/20 text-muted hover:text-warning data-[active=true]:bg-warning-dim data-[active=true]:text-warning data-[active=true]:border-warning/30",
    },
    {
      value: "weak",
      label: "Weak",
      className:
        "border-danger/20 text-muted hover:text-danger data-[active=true]:bg-danger-dim data-[active=true]:text-danger data-[active=true]:border-[#EF4444]/30",
    },
  ];

const SCORE_BADGE: Record<string, string> = {
  strong: "bg-accent-dim text-accent border-accent/20",
  moderate: "bg-warning-dim text-warning border-warning/20",
  weak: "bg-danger-dim text-danger border-danger/20",
};


function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-14 h-14 bg-surface border border-border rounded-2xl flex items-center justify-center mb-5">
        <FileSearch className="w-6 h-6 text-muted" />
      </div>
      <h3 className="text-base font-semibold text-zinc-100 mb-2">
        No analyses yet
      </h3>
      <p className="text-sm text-muted mb-6 max-w-xs leading-relaxed">
        Run your first analysis to see how well your resume matches a job
        description.
      </p>
      <Button
        size="sm"
        className="bg-accent hover:bg-accent-hover text-black font-semibold gap-2"
        asChild
      >
        <Link href="/analyze">
          Start your first analysis
          <ChevronRight className="w-4 h-4" />
        </Link>
      </Button>
    </div>
  );
}

function NoResults({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 bg-surface border border-border rounded-xl flex items-center justify-center mb-4">
        <Search className="w-5 h-5 text-muted" />
      </div>
      <p className="text-sm text-zinc-100 font-medium mb-1">No results found</p>
      <p className="text-xs text-muted">
        No analyses matching{" "}
        <span className="text-zinc-300 font-mono">"{query}"</span>
      </p>
    </div>
  );
}

export default function HistoryPage() {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<Tier>("all");
  const [data, setData] = useState(ALL_ANALYSES);

  const handleDelete = (id: string) => {
    setData((prev) => prev.filter((a) => a.id !== id));
  };

  const filtered = data.filter((a) => {
    const matchesSearch =
      search.trim() === "" ||
      a.jobTitle.toLowerCase().includes(search.toLowerCase()) ||
      a.company.toLowerCase().includes(search.toLowerCase());
    const matchesTier = tierFilter === "all" || a.tier === tierFilter;
    return matchesSearch && matchesTier;
  });

  const isEmpty = data.length === 0;
  const hasResults = filtered.length > 0;

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

        <div className="p-8">
          {/* Page header */}
          <div className="mb-6">
            <h1
              className="text-2xl font-normal text-zinc-100"
              style={{ fontFamily: "'DM Serif Display', serif" }}
            >
              Analysis History
            </h1>
            <p className="text-sm text-muted mt-1">
              {data.length} total{" "}
              {data.length === 1 ? "analysis" : "analyses"} on record.
            </p>
          </div>

          {isEmpty ? (
            <EmptyState />
          ) : (
            <>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
                  <Input
                    placeholder="Search by title or company..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 bg-surface border-border text-zinc-100 placeholder:text-muted focus-visible:ring-[#22C55E]/30 focus-visible:border-accent/40 text-sm h-9"
                  />
                </div>

                {/* Tier filter pills */}
                <div className="flex items-center gap-1.5">
                  {TIER_FILTER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      data-active={tierFilter === opt.value}
                      onClick={() => setTierFilter(opt.value)}
                      className={cn(
                        "h-9 px-3.5 rounded-lg border text-xs font-medium transition-all",
                        opt.className
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table */}
              {!hasResults ? (
                <NoResults query={search} />
              ) : (
                <Card className="bg-surface border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-muted text-xs font-medium uppercase tracking-wider pl-5">
                          Date
                        </TableHead>
                        <TableHead className="text-muted text-xs font-medium uppercase tracking-wider">
                          Job Title
                        </TableHead>
                        <TableHead className="text-muted text-xs font-medium uppercase tracking-wider">
                          Company
                        </TableHead>
                        <TableHead className="text-muted text-xs font-medium uppercase tracking-wider">
                          Score
                        </TableHead>
                        <TableHead className="text-muted text-xs font-medium uppercase tracking-wider pr-5 text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((analysis) => (
                        <TableRow
                          key={analysis.id}
                          className="border-border hover:bg-surface-hover transition-colors group"
                        >
                          <TableCell
                            className="pl-5 py-3.5 text-xs font-mono text-muted"
                            style={{ fontFamily: "'JetBrains Mono', monospace" }}
                          >
                            {analysis.date}
                          </TableCell>
                          <TableCell className="py-3.5 text-sm font-medium text-zinc-100">
                            {analysis.jobTitle}
                          </TableCell>
                          <TableCell className="py-3.5 text-sm text-muted">
                            {analysis.company}
                          </TableCell>
                          <TableCell className="py-3.5">
                            <Badge
                              className={cn(
                                "font-mono text-xs border px-2.5 py-0.5 font-bold",
                                SCORE_BADGE[analysis.tier]
                              )}
                              style={{
                                fontFamily: "'JetBrains Mono', monospace",
                              }}
                            >
                              {analysis.score}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3.5 pr-5">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-3 text-xs text-muted hover:text-zinc-100 hover:bg-border gap-1"
                                asChild
                              >
                                <Link href={`/analysis/${analysis.id}`}>
                                  <ExternalLink className="w-3 h-3" />
                                  View
                                </Link>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(analysis.id)}
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

                  {/* Footer */}
                  <Separator className="bg-[#1F1F23]" />
                  <div className="px-5 py-3 flex items-center justify-between">
                    <span
                      className="text-xs font-mono text-muted"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      Showing {filtered.length} of {data.length}
                    </span>
                    {filtered.length !== data.length && (
                      <button
                        onClick={() => {
                          setSearch("");
                          setTierFilter("all");
                        }}
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
  );
}
