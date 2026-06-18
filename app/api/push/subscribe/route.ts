import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-guard'

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const { supabase, user, householdId } = auth

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'リクエスト本文が不正です' }, { status: 400 })
  }

  const { endpoint, keys } = body as {
    endpoint?: string
    keys?: { p256dh?: string; auth?: string }
  }
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: '購読情報が不正です' }, { status: 400 })
  }

  await supabase.from('push_subscriptions').upsert(
    {
      household_id: householdId,
      user_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
    { onConflict: 'user_id,endpoint' }
  )

  return NextResponse.json({ ok: true })
}
