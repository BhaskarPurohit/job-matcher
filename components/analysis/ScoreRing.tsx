// FILE: components/analysis/ScoreRing.tsx
"use client";

import { cn } from "@/lib/utils";

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function ScoreRing({
  score,
  size = 200,
  strokeWidth = 8,
  className,
}: ScoreRingProps) {
  const clampedScore = Math.min(100, Math.max(0, score));

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Arc goes from top (−90°), clockwise. We map 0–100 to 0–circumference.
  const dashOffset = circumference - (clampedScore / 100) * circumference;

  const cx = size / 2;
  const cy = size / 2;

  // Color thresholds
  const arcColor =
    clampedScore >= 70
      ? "var(--accent)"
      : clampedScore >= 40
      ? "var(--warn)"
      : "var(--danger)";

  const glowColor =
    clampedScore >= 70
      ? "rgba(34,197,94,0.25)"
      : clampedScore >= 40
      ? "rgba(245,158,11,0.25)"
      : "rgba(239,68,68,0.25)";

  const labelColor =
    clampedScore >= 70
      ? "text-accent"
      : clampedScore >= 40
      ? "text-warning"
      : "text-danger";

  const fontSize = size * 0.26;
  const subFontSize = size * 0.085;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        aria-label={`Match score: ${clampedScore} out of 100`}
        role="img"
      >
        {/* Glow filter */}
        <defs>
          <filter id={`glow-${score}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Track ring */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke="var(--border)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Progress arc — starts at top (−90°) going clockwise */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={arcColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{
            transition: "stroke-dashoffset 0.9s cubic-bezier(0.34, 1.56, 0.64, 1)",
            filter: `drop-shadow(0 0 6px ${glowColor})`,
          }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
        <span
          className={cn(
            "font-mono font-bold leading-none tracking-tighter",
            labelColor
          )}
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: `${fontSize}px`,
          }}
        >
          {clampedScore}
        </span>
        <span
          className="text-muted font-mono uppercase tracking-widest mt-1"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: `${subFontSize}px`,
          }}
        >
          / 100
        </span>
      </div>
    </div>
  );
}
