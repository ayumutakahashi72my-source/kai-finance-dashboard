import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-guard'

export async function GET() {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const { supabase, householdId } = auth

  const { data: logs } = await supabase
    .from('mf_sync_logs')
    .select('id, triggered_by, status, step, inserted, skipped, year, month, error_msg, created_at')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ logs: logs ?? [] })
}
