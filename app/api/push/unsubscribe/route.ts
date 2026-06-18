import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-guard'

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const { supabase, user } = auth

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'リクエスト本文が不正です' }, { status: 400 })
  }

  const { endpoint } = body as { endpoint?: string }
  if (!endpoint) return NextResponse.json({ error: 'endpointが必要です' }, { status: 400 })

  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', endpoint)

  return NextResponse.json({ ok: true })
}
