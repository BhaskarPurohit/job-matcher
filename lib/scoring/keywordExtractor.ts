// ─────────────────────────────────────────────────────────────────────────────
// Keyword extraction + keyword-based ATS score (40 % of final composite score)
// ─────────────────────────────────────────────────────────────────────────────

const STOPWORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with',
  'by','from','up','about','into','through','during','is','are','was',
  'were','be','been','being','have','has','had','do','does','did','will',
  'would','could','should','may','might','shall','can','need','dare',
  'that','this','these','those','it','its','i','you','he','she','we',
  'they','what','which','who','whom','not','no','nor','so','yet','both',
  'either','neither','as','if','then','than','because','while','although',
  'though','after','before','since','until','unless','whether','each',
  'every','any','all','more','most','other','such','only','own','same',
])

/**
 * Tokenise `text`, remove stopwords, and return a word → frequency map.
 * Tokens are lowercased and must be ≥ 3 characters (filters noise like "it").
 */
export function extractKeywords(text: string): Map<string, number> {
  const freq = new Map<string, number>()

  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s+#]/g, ' ')   // keep c++, c#, etc.
    .split(/\s+/)

  for (const raw of tokens) {
    const word = raw.trim()
    if (word.length < 3) continue
    if (STOPWORDS.has(word)) continue
    freq.set(word, (freq.get(word) ?? 0) + 1)
  }

  return freq
}

/**
 * Compute a 0–100 keyword match score.
 *
 * Algorithm:
 *   1. Extract keyword frequencies from both texts.
 *   2. For each JD keyword that also appears in the resume, accumulate its
 *      JD frequency as a "hit weight".
 *   3. Divide by total JD keyword weight to get a hit ratio.
 *   4. Apply a soft ceiling via square-root damping so a 100 % keyword match
 *      scores ~95 rather than a hard 100 (AI score fills the gap).
 */
export function computeKeywordScore(resumeText: string, jdText: string): number {
  const resumeKw = extractKeywords(resumeText)
  const jdKw     = extractKeywords(jdText)

  if (jdKw.size === 0) return 0

  let totalWeight = 0
  let hitWeight   = 0

  jdKw.forEach((freq, word) => {
    totalWeight += freq
    if (resumeKw.has(word)) {
      hitWeight += freq
    }
  })

  if (totalWeight === 0) return 0

  const rawRatio  = hitWeight / totalWeight          // 0–1
  const dampened  = Math.sqrt(rawRatio)              // soft ceiling
  const score     = Math.round(dampened * 95)        // scale to 0–95

  return Math.min(score, 100)
}
