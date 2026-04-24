export type MatchTier = 'strong' | 'moderate' | 'weak'
export type SkillImportance = 'required' | 'preferred' | 'nice-to-have'
export type SuggestionSection = 'Summary' | 'Skills' | 'Experience' | 'Education' | 'Projects' | 'Certifications'

export interface Skill {
  name: string
  importance: SkillImportance
}

export interface Suggestion {
  section: SuggestionSection
  suggested: string   // text of the suggested change
  reasoning: string
}

// The shape the AI must return (validated by Zod in the route)
export interface AIAnalysisResult {
  matchScore: number
  presentSkills: Skill[]
  missingSkills: Skill[]
  strengths: string[]
  tailoredSummary: string
  suggestions: Suggestion[]
}

// Full analysis record (includes input metadata + AI output)
export interface Analysis extends AIAnalysisResult {
  id: string
  jobTitle: string
  companyName?: string
  matchTier: MatchTier
  createdAt: string
  processingMs: number
}

// API request/response contracts
export interface AnalyzeRequest {
  resumeText: string
  jobDescription: string
  jobTitle?: string
  companyName?: string
}

export interface AnalyzeResponse {
  success: true
  data: AIAnalysisResult & {
    id: string
    matchTier: MatchTier
    processingMs: number
  }
}

// Structured field error — returned when Zod validation fails.
// `field` is the dot-path to the offending input key (e.g. "resumeText").
export interface FieldError {
  field: string
  message: string
}

// Validation failures: always include `fieldErrors` so the client can
// highlight the specific input. Other error codes use an empty array.
export interface AnalyzeErrorResponse {
  success: false
  code: 'VALIDATION_ERROR' | 'AI_ERROR' | 'RATE_LIMIT' | 'INTERNAL_ERROR'
  error: string          // human-readable summary, safe to display
  fieldErrors: FieldError[]  // populated only for VALIDATION_ERROR
}
