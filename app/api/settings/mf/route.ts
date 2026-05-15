import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getHouseholdId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('households')
    .select('id, settings')
    .eq('owner_id', userId)
    .limit(1)
    .single()
  return data
}

// GET: MF設定の取得（パスワードはマスク）
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const household = await getHouseholdId(supabase, user.id)
  if (!household) return NextResponse.json({ error: '世帯が見つかりません' }, { status: 404 })

  const settings = household.settings as { mf_email?: string; mf_password?: string } | null
  return NextResponse.json({
    mf_email: settings?.mf_email ?? null,
    mf_enabled: !!(settings?.mf_email && settings?.mf_password),
  })
}

// PUT: MF認証情報を保存
export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const household = await getHouseholdId(supabase, user.id)
  if (!household) return NextResponse.json({ error: '世帯が見つかりません' }, { status: 404 })

  const body = (await req.json()) as { mf_email: string; mf_password: string }
  if (!body.mf_email || !body.mf_password) {
    return NextResponse.json({ error: 'メールアドレスとパスワードは必須です' }, { status: 400 })
  }

  const newSettings = {
    ...(household.settings as object ?? {}),
    mf_email: body.mf_email,
    mf_password: body.mf_password,
  }

  const { error } = await supabase
    .from('households')
    .update({ settings: newSettings })
    .eq('id', household.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE: MF設定を削除
export async function DELETE() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const household = await getHouseholdId(supabase, user.id)
  if (!household) return NextResponse.json({ error: '世帯が見つかりません' }, { status: 404 })

  const settings = { ...(household.settings as object ?? {}) }
  delete (settings as Record<string, unknown>)['mf_email']
  delete (settings as Record<string, unknown>)['mf_password']

  const { error } = await supabase
    .from('households')
    .update({ settings })
    .eq('id', household.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
