import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getHouseholdId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', userId)
    .limit(1)
    .single()
  return data?.household_id ?? null
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const hid = await getHouseholdId(supabase, user.id)
  if (!hid) return NextResponse.json({ error: '世帯が見つかりません' }, { status: 400 })

  const { data, error } = await supabase
    .from('fixed_expense_suggestions')
    .select('*')
    .eq('household_id', hid)
    .order('avg_amount', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data ?? [] })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const hid = await getHouseholdId(supabase, user.id)
  if (!hid) return NextResponse.json({ error: '世帯が見つかりません' }, { status: 400 })

  let body: { id?: string; dismissed?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'リクエスト形式が不正です' }, { status: 400 })
  }
  if (!body.id) return NextResponse.json({ error: 'id が必要です' }, { status: 400 })
  if (typeof body.dismissed !== 'boolean') return NextResponse.json({ error: 'dismissed は boolean が必要です' }, { status: 400 })

  const { error } = await supabase
    .from('fixed_expense_suggestions')
    .update({ dismissed: body.dismissed, updated_at: new Date().toISOString() })
    .eq('id', body.id)
    .eq('household_id', hid)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
