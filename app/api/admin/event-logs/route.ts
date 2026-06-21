import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-guard'

export async function GET(request: NextRequest) {
  const auth = await requireAuth({ requireAdmin: true })
  if (!auth.ok) return auth.response

  const { supabase } = auth
  const params = request.nextUrl.searchParams
  const level = params.get('level')
  const category = params.get('category')
  const limit = Math.min(parseInt(params.get('limit') ?? '100'), 500)
  const offset = parseInt(params.get('offset') ?? '0')

  let query = supabase
    .from('event_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (level && ['error', 'warn', 'info'].includes(level)) {
    query = query.eq('level', level)
  }
  if (category) {
    query = query.eq('category', category)
  }

  const { data, error, count } = await query

  if (error) {
    console.error('[admin/event-logs] query failed:', error.message)
    return NextResponse.json({ error: 'ログの取得に失敗しました' }, { status: 500 })
  }

  const userMap: Record<string, string> = {}
  const { data: members } = await supabase.rpc('get_household_members_with_email')
  if (members) {
    for (const m of members as { user_id: string; display_name: string; email: string }[]) {
      userMap[m.user_id] = m.display_name || m.email
    }
  }

  const logs = (data ?? []).map((log: Record<string, unknown>) => ({
    ...log,
    user_name: log.user_id ? (userMap[log.user_id as string] ?? null) : null,
  }))

  const [
    { count: errorCount },
    { count: warnCount },
    { count: infoCount },
  ] = await Promise.all([
    supabase.from('event_logs').select('*', { count: 'exact', head: true }).eq('level', 'error'),
    supabase.from('event_logs').select('*', { count: 'exact', head: true }).eq('level', 'warn'),
    supabase.from('event_logs').select('*', { count: 'exact', head: true }).eq('level', 'info'),
  ])

  const counts = {
    error: errorCount ?? 0,
    warn: warnCount ?? 0,
    info: infoCount ?? 0,
    total: (errorCount ?? 0) + (warnCount ?? 0) + (infoCount ?? 0),
  }

  return NextResponse.json({ logs, total: count ?? 0, counts })
}
