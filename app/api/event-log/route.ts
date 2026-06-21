import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-guard'

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const { supabase, user, householdId } = auth

  let body: { events?: unknown[]; url?: string; userAgent?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const events = body.events
  if (!Array.isArray(events) || events.length === 0 || events.length > 50) {
    return NextResponse.json({ error: 'events must be 1-50 items' }, { status: 400 })
  }

  const VALID_LEVELS = new Set(['error', 'warn', 'info'])

  const rows = events
    .filter((e): e is { level?: string; category: string; message: string; metadata?: Record<string, unknown> } =>
      typeof e === 'object' && e !== null && typeof (e as Record<string, unknown>).category === 'string' && typeof (e as Record<string, unknown>).message === 'string'
    )
    .map((e) => ({
      household_id: householdId,
      user_id: user.id,
      level: VALID_LEVELS.has(e.level ?? '') ? e.level! : 'info',
      category: e.category.slice(0, 100),
      message: e.message.slice(0, 2000),
      metadata: e.metadata ?? null,
      url: typeof body.url === 'string' ? body.url.slice(0, 500) : null,
      user_agent: typeof body.userAgent === 'string' ? body.userAgent.slice(0, 500) : null,
    }))

  if (rows.length === 0) {
    return NextResponse.json({ error: 'no valid events' }, { status: 400 })
  }

  const { error } = await supabase.from('event_logs').insert(rows)
  if (error) {
    console.error('[event-log] insert failed:', error.message)
    return NextResponse.json({ error: 'insert failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, count: rows.length })
}
