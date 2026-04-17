import { z } from 'zod'
import type { FieldError } from '@/types/analysis'

// ─────────────────────────────────────────────────────────────────────────────
// Request validation
// ─────────────────────────────────────────────────────────────────────────────

export const AnalyzeRequestSchema = z.object({
  resumeText: z
    .string({ required_error: 'Resume text is required' })
    .min(100, 'Resume is too short — paste the full text (min 100 characters)')
    .max(15_000, 'Resume exceeds the 15,000 character limit')
    .refine((s) => s.trim().length >= 100, 'Resume text cannot be only whitespace'),

  jobDescription: z
    .string({ required_error: 'Job description is required' })
    .min(50, 'Job description is too short (min 50 characters)')
    .max(8_000, 'Job description exceeds the 8,000 character limit')
    .refine((s) => s.trim().length >= 50, 'Job description cannot be only whitespace'),

  jobTitle: z
    .string()
    .max(200, 'Job title cannot exceed 200 characters')
    .optional(),

  companyName: z
    .string()
    .max(200, 'Company name cannot exceed 200 characters')
    .optional(),
})

export type ValidatedAnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>

// Converts a Zod error into structured FieldError[] so clients can map
// errors back to specific form inputs without parsing a string.
export function extractFieldErrors(error: z.ZodError): FieldError[] {
  return error.errors.map((issue) => ({
    // issue.path is an array like ['resumeText'] or ['nested', 'field']
    // join with '.' to get a dot-path string clients can match on
    field:   issue.path.join('.') || 'unknown',
    message: issue.message,
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
// AI output validation
// Zod parses the raw JSON the model returns before we trust any field.
// ─────────────────────────────────────────────────────────────────────────────

const SkillSchema = z.object({
  name:       z.string().min(1),
  importance: z.enum(['required', 'preferred', 'nice-to-have']),
})

export const AIAnalysisSchema = z.object({
  matchScore: z.number().int().min(0).max(100),

  presentSkills: z.array(SkillSchema).max(20),
  missingSkills: z.array(SkillSchema).max(15),

  strengths: z.array(z.string().min(1)).min(1).max(10),

  tailoredSummary: z.string().min(10).max(1000),

  suggestions: z
    .array(
      z.object({
        section:   z.enum(['summary', 'experience', 'skills', 'education']),
        suggested: z.string().min(1),
        reasoning: z.string().min(1),
      })
    )
    .max(10),
})
