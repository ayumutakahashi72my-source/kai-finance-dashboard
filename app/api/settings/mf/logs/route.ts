import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()
  if (!membership) return NextResponse.json({ logs: [] })

  const { data: logs } = await supabase
    .from('mf_sync_logs')
    .select('id, triggered_by, status, step, inserted, skipped, year, month, error_msg, created_at')
    .eq('household_id', membership.household_id)
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ logs: logs ?? [] })
}
