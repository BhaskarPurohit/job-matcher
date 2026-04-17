import { createClient } from '@/lib/supabase/server'
import { listAnalysesByUser } from '@/lib/data/analyses'
import { HistoryClient } from './HistoryClient'

export default async function HistoryPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const analyses = user ? await listAnalysesByUser(user.id) : []

  return <HistoryClient initialAnalyses={analyses} />
}
