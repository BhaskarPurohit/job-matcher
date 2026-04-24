// ─────────────────────────────────────────────────────────────────────────────
// Composite scorer — blends keyword ATS score (40%) and AI score (60%)
// ─────────────────────────────────────────────────────────────────────────────

export interface ScoreBreakdown {
  keywordScore: number
  aiScore:      number
  finalScore:   number
  methodology:  string
}

export function computeCompositeScore(
  keywordScore: number,
  aiScore:      number,
): ScoreBreakdown {
  const finalScore = Math.round(keywordScore * 0.4 + aiScore * 0.6)

  return {
    keywordScore,
    aiScore,
    finalScore,
    methodology: 'ATS keyword match (40%) + AI skill assessment (60%)',
  }
}
