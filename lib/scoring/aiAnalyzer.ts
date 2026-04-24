// ─────────────────────────────────────────────────────────────────────────────
// AI skill-assessment layer (60 % of final composite score)
// Uses Anthropic Claude (already configured in this project).
// ─────────────────────────────────────────────────────────────────────────────
import Anthropic from '@anthropic-ai/sdk'
import type { SuggestionSection, SkillImportance } from '@/types/analysis'

// ── Types ────────────────────────────────────────────────────────────────────

export interface AIMissingSkill {
  skill:    string
  priority: 'high' | 'medium' | 'low'
}

export interface AISuggestion {
  section:        SuggestionSection
  recommendation: string
}

/** Raw shape the model must return */
export interface AIAnalyzerResult {
  aiScore:         number           // 0–100
  presentSkills:   string[]
  missingSkills:   AIMissingSkill[]
  keyStrengths:    string[]
  tailoredSummary: string
  suggestions:     AISuggestion[]
  atsKeywords:     string[]
}

export interface AIAnalyzerResponse {
  result:           AIAnalyzerResult
  promptTokens:     number
  completionTokens: number
}

/** Returned when the model output cannot be parsed or validated */
const FALLBACK_RESULT: AIAnalyzerResult = {
  aiScore:         50,
  presentSkills:   [],
  missingSkills:   [],
  keyStrengths:    [],
  tailoredSummary: '',
  suggestions:     [],
  atsKeywords:     [],
}

// ── Constants ─────────────────────────────────────────────────────────────────

const RESUME_LIMIT = 6_000
const JD_LIMIT     = 3_000

const VALID_SECTIONS: SuggestionSection[] = [
  'Summary','Skills','Experience','Education','Projects','Certifications',
]

const PRIORITY_MAP: Record<string, SkillImportance> = {
  high:   'required',
  medium: 'preferred',
  low:    'nice-to-have',
}

export { PRIORITY_MAP }

// ── Client (module-level singleton) ──────────────────────────────────────────

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Helpers ───────────────────────────────────────────────────────────────────

function truncate(text: string, limit: number): string {
  return text.length <= limit ? text : text.slice(0, limit) + '\n[truncated]'
}

function buildPrompt(resumeText: string, jdText: string): string {
  return `SYSTEM: You are an ATS and hiring expert. Respond ONLY with valid JSON, no markdown, no explanation.

RESUME:
${truncate(resumeText.trim(), RESUME_LIMIT)}

JOB DESCRIPTION:
${truncate(jdText.trim(), JD_LIMIT)}

Return ONLY this JSON object — no text before or after:
{
  "aiScore": <integer 0-100, genuine AI assessment of candidate fit>,
  "presentSkills": ["<skill present in resume that matches JD>"],
  "missingSkills": [{ "skill": "<name>", "priority": "high" | "medium" | "low" }],
  "keyStrengths": ["<strength relevant to this role>"],
  "tailoredSummary": "<2-3 sentence first-person summary optimised for this role>",
  "suggestions": [
    {
      "section": "Summary" | "Skills" | "Experience" | "Education" | "Projects" | "Certifications",
      "recommendation": "<specific actionable change>"
    }
  ],
  "atsKeywords": ["<important keyword from JD missing from resume>"]
}

Rules:
- aiScore: reflect genuine skill and experience alignment, not keyword presence (that is handled separately)
- presentSkills: 3–10 items
- missingSkills: 3–8 items, priority=high for required/critical gaps
- keyStrengths: 3–5 items
- tailoredSummary: ATS-optimised, targeted at this specific role
- suggestions: 3–5 items, each section label used AT MOST ONCE
- atsKeywords: 5–10 high-value keywords the resume should include`
}

function safeParseJSON(raw: string): unknown {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    // Try to extract the first {...} block as a fallback
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (match) {
      try { return JSON.parse(match[0]) } catch { /* fall through */ }
    }
    return null
  }
}

function validateResult(raw: unknown): AIAnalyzerResult {
  if (!raw || typeof raw !== 'object') return FALLBACK_RESULT
  const r = raw as Record<string, unknown>

  const aiScore = typeof r.aiScore === 'number'
    ? Math.max(0, Math.min(100, Math.round(r.aiScore)))
    : FALLBACK_RESULT.aiScore

  const presentSkills = Array.isArray(r.presentSkills)
    ? (r.presentSkills as unknown[]).filter((s): s is string => typeof s === 'string').slice(0, 10)
    : []

  const missingSkills: AIMissingSkill[] = Array.isArray(r.missingSkills)
    ? (r.missingSkills as unknown[])
        .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
        .map((s) => ({
          skill:    typeof s.skill === 'string' ? s.skill : '',
          priority: (['high','medium','low'] as const).includes(s.priority as 'high')
            ? s.priority as AIMissingSkill['priority']
            : 'medium',
        }))
        .filter((s) => s.skill.length > 0)
        .slice(0, 8)
    : []

  const keyStrengths = Array.isArray(r.keyStrengths)
    ? (r.keyStrengths as unknown[]).filter((s): s is string => typeof s === 'string').slice(0, 5)
    : []

  const tailoredSummary = typeof r.tailoredSummary === 'string' ? r.tailoredSummary : ''

  // Deduplicate suggestions by section
  const seen: Record<string, AISuggestion> = {}
  if (Array.isArray(r.suggestions)) {
    for (const s of r.suggestions as unknown[]) {
      if (!s || typeof s !== 'object') continue
      const item = s as Record<string, unknown>
      const section = item.section as string
      if (!VALID_SECTIONS.includes(section as SuggestionSection)) continue
      const recommendation = typeof item.recommendation === 'string' ? item.recommendation : ''
      if (!recommendation) continue
      seen[section] = { section: section as SuggestionSection, recommendation }
    }
  }
  const suggestions = Object.values(seen).slice(0, 5)

  const atsKeywords = Array.isArray(r.atsKeywords)
    ? (r.atsKeywords as unknown[]).filter((s): s is string => typeof s === 'string').slice(0, 10)
    : []

  return { aiScore, presentSkills, missingSkills, keyStrengths, tailoredSummary, suggestions, atsKeywords }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function runAIAnalysis(
  resumeText: string,
  jdText: string,
): Promise<AIAnalyzerResponse> {
  const response = await anthropic.messages.create({
    model:      process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5',
    max_tokens: 2048,
    temperature: 0.2,
    messages: [{ role: 'user', content: buildPrompt(resumeText, jdText) }],
  })

  const rawText = response.content[0]?.type === 'text' ? response.content[0].text : ''
  const parsed  = safeParseJSON(rawText)
  const result  = validateResult(parsed)

  return {
    result,
    promptTokens:     response.usage.input_tokens,
    completionTokens: response.usage.output_tokens,
  }
}
