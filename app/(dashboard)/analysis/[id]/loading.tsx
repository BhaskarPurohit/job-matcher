import React from 'react'

// Next.js automatically renders this file while the async server component
// (page.tsx) is fetching data. No props, no "use client" needed.
//
// Design goals:
//   - Pixel-perfect match to the real page layout — zero layout shift on resolve
//   - Directional shimmer (left→right sweep) instead of flat opacity pulse
//   - The ScoreRing skeleton uses an SVG arc to match the real component's shape

function Shimmer({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`relative overflow-hidden bg-border rounded ${className}`}
      style={style}
    >
      {/* Directional shimmer sweep */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
    </div>
  )
}

function ScoreRingSkeleton() {
  const size = 200
  const strokeWidth = 10
  const r = (size - strokeWidth) / 2
  const cx = size / 2
  const circumference = 2 * Math.PI * r

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Background track */}
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={strokeWidth}
        />
        {/* Animated arc segment — shimmer implies progress */}
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke="var(--color-border-hover)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * 0.35}
          strokeLinecap="round"
          className="animate-pulse"
        />
      </svg>
      {/* Center number placeholder */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
        <Shimmer className="h-10 w-16 rounded-md" />
        <Shimmer className="h-3 w-10" />
      </div>
    </div>
  )
}

export default function AnalysisLoading() {
  return (
    // keyframes defined in tailwind.config.ts under keyframes: { shimmer: ... }
    <div>
      {/* Top bar — mirrors real page exactly */}
      <div className="h-14 border-b border-border flex items-center justify-between px-8">
        <Shimmer className="h-7 w-32 rounded-md" />
        <Shimmer className="h-4 w-24" />
      </div>

      <div className="p-8 space-y-6 max-w-5xl">

        {/* ── Hero card ── */}
        <div className="bg-surface border border-border rounded-xl p-8 flex flex-col items-center gap-4">
          <Shimmer className="h-3 w-20" />
          <Shimmer className="h-6 w-64 rounded-md" />
          <Shimmer className="h-6 w-28 rounded-full" />
          <ScoreRingSkeleton />
          <Shimmer className="h-4 w-56" />
        </div>

        {/* ── Skills grid ── */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Present skills card */}
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-5 pt-5 pb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-border" />
              <Shimmer className="h-4 w-28" />
              <Shimmer className="h-3 w-12 ml-auto" />
            </div>
            <div className="h-px bg-border" />
            <div className="p-5 flex flex-wrap gap-2">
              {[80, 64, 96, 72, 88, 60].map((w, i) => (
                <Shimmer key={i} className={`h-6 rounded-full`} style={{ width: w }} />
              ))}
            </div>
          </div>

          {/* Missing skills card */}
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-5 pt-5 pb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-border" />
              <Shimmer className="h-4 w-28" />
              <Shimmer className="h-3 w-10 ml-auto" />
            </div>
            <div className="h-px bg-border" />
            <div className="p-5 flex flex-col gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <Shimmer className="h-4 w-32" />
                  <Shimmer className="h-5 w-20 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Tailored summary card ── */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shimmer className="h-4 w-4 rounded" />
              <Shimmer className="h-4 w-36" />
            </div>
            <Shimmer className="h-7 w-16 rounded-md" />
          </div>
          <div className="h-px bg-border" />
          <div className="p-5 space-y-2">
            <Shimmer className="h-3.5 w-full" />
            <Shimmer className="h-3.5 w-[92%]" />
            <Shimmer className="h-3.5 w-[85%]" />
            <Shimmer className="h-3.5 w-[78%]" />
            <Shimmer className="h-3 w-48 mt-3" />
          </div>
        </div>

        {/* ── Suggestions card ── */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-5 pt-5 pb-3 space-y-1">
            <Shimmer className="h-4 w-44" />
            <Shimmer className="h-3 w-56" />
          </div>
          <div className="h-px bg-border" />
          <div className="p-5 space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="border border-border rounded-lg px-4 py-3 flex items-center gap-3"
              >
                <Shimmer className="h-5 w-7 rounded" />
                <Shimmer className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>

        {/* ── Action buttons ── */}
        <div className="flex items-center gap-3 pt-2">
          <Shimmer className="h-9 w-32 rounded-md" />
          <Shimmer className="h-9 w-36 rounded-md" />
        </div>

      </div>
    </div>
  )
}
