import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-guard'

export async function GET() {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response
  const { supabase, householdId } = auth

  const { data, error } = await supabase
    .from('fixed_expense_suggestions')
    .select('id, payee, avg_amount, months_seen, dismissed, confirmed_at, detected_at')
    .eq('household_id', householdId)
    .order('avg_amount', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data ?? [] })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response
  const { supabase, householdId } = auth

  let body: { payee?: string; avg_amount?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'リクエスト形式が不正です' }, { status: 400 })
  }

  const payee = body.payee?.trim()
  if (!payee) return NextResponse.json({ error: '店舗名が必要です' }, { status: 400 })
  if (typeof body.avg_amount !== 'number' || body.avg_amount <= 0) {
    return NextResponse.json({ error: '金額は正の数値が必要です' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('fixed_expense_suggestions')
    .upsert({
      household_id: householdId,
      payee,
      avg_amount: Math.round(body.avg_amount),
      months_seen: 0,
      dismissed: false,
      confirmed_at: new Date().toISOString(),
      detected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'household_id,payee' })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response
  const { supabase, householdId } = auth

  let body: { id?: string; dismissed?: boolean; confirmed?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'リクエスト形式が不正です' }, { status: 400 })
  }
  if (!body.id) return NextResponse.json({ error: 'id が必要です' }, { status: 400 })

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.dismissed === 'boolean') {
    patch.dismissed = body.dismissed
    if (body.dismissed) patch.confirmed_at = null
  } else if (typeof body.confirmed === 'boolean') {
    patch.confirmed_at = body.confirmed ? new Date().toISOString() : null
    if (body.confirmed) patch.dismissed = false
  } else {
    return NextResponse.json({ error: 'dismissed または confirmed が必要です' }, { status: 400 })
  }

  const { error } = await supabase
    .from('fixed_expense_suggestions')
    .update(patch)
    .eq('id', body.id)
    .eq('household_id', householdId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
