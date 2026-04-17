import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Analysis } from '@/types/analysis'
import { mapRow } from '@/lib/data/analyses'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  const analyses: Analysis[] = (data ?? []).map(mapRow)
  return NextResponse.json({ success: true, data: analyses })
}
