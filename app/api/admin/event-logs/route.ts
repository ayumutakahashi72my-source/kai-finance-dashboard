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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

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

  return NextResponse.json({ logs: data ?? [], total: count ?? 0, counts })
}
