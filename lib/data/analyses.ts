import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { Analysis } from '@/types/analysis'

export function mapRow(data: Record<string, unknown>): Analysis {
  return {
    id:              data.id as string,
    jobTitle:        data.job_title as string,
    companyName:     data.company_name as string | undefined,
    matchScore:      data.match_score as number,
    matchTier:       data.match_tier as Analysis['matchTier'],
    presentSkills:   data.present_skills as Analysis['presentSkills'],
    missingSkills:   data.missing_skills as Analysis['missingSkills'],
    strengths:       data.strengths as string[],
    tailoredSummary: data.tailored_summary as string,
    suggestions:     data.suggestions as Analysis['suggestions'],
    processingMs:    data.processing_ms as number,
    createdAt:       data.created_at as string,
  }
}

export async function getAnalysisById(id: string): Promise<Analysis | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return mapRow(data)
}

export async function listAnalysesByUser(userId: string): Promise<Analysis[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return data.map(mapRow)
}
