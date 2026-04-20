// ~4 chars per token. Keep total input under ~3000 tokens.
const RESUME_CHAR_LIMIT = 6000
const JD_CHAR_LIMIT     = 3000

function truncate(text: string, limit: number): string {
  if (text.length <= limit) return text
  return text.slice(0, limit) + '\n[truncated]'
}

export function buildAnalysisPrompt(resumeText: string, jobDescription: string): string {
  const resume = truncate(resumeText.trim(), RESUME_CHAR_LIMIT)
  const jd     = truncate(jobDescription.trim(), JD_CHAR_LIMIT)

  return `You are an ATS analyst. Analyze the resume against the job description and return JSON only.

RESUME:
${resume}

JOB DESCRIPTION:
${jd}

Return ONLY valid JSON, no markdown:

{
  "matchScore": <integer 0-100, how well the resume matches the job>,
  "presentSkills": [
    { "name": "<skill name>", "importance": "required" | "preferred" | "nice-to-have" }
  ],
  "missingSkills": [
    { "name": "<skill name>", "importance": "required" | "preferred" | "nice-to-have" }
  ],
  "strengths": [
    "<string describing a strength the candidate has for this role>"
  ],
  "tailoredSummary": "<2-3 sentence professional summary written for this specific job>",
  "suggestions": [
    {
      "section": "summary" | "experience" | "skills" | "education",
      "suggested": "<specific actionable change to make>",
      "reasoning": "<why this change improves the match>"
    }
  ]
}

Rules:
- matchScore must reflect genuine ATS keyword and skill alignment, not optimism
- presentSkills: skills from the job description that ARE present in the resume (3-10 items)
- missingSkills: skills explicitly mentioned in the job description that are ABSENT from the resume (3-8 items)
- strengths: 3-5 genuine strengths from the resume relevant to this role
- tailoredSummary: write in first person, professional, targeted at this specific role
- suggestions: 3-5 specific, actionable improvements (not vague advice)
- Return nothing outside the JSON object`
}
