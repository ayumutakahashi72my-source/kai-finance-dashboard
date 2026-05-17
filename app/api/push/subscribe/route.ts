import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { data: member } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()
  if (!member) return NextResponse.json({ error: '世帯が見つかりません' }, { status: 400 })

  const body = await req.json() as {
    endpoint?: string
    keys?: { p256dh?: string; auth?: string }
  }
  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ error: '購読情報が不正です' }, { status: 400 })
  }

  await supabase.from('push_subscriptions').upsert(
    {
      household_id: member.household_id,
      user_id: user.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
    },
    { onConflict: 'user_id,endpoint' }
  )

  return NextResponse.json({ ok: true })
}
