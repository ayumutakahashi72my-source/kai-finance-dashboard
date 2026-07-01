import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-guard'
import { z } from 'zod'

// GET: 世帯の通知関連フラグを取得（未設定時は両方とも既定で有効）
export async function GET() {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response
  const { supabase, householdId } = auth

  const { data } = await supabase
    .from('households')
    .select('settings')
    .eq('id', householdId)
    .single()

  const settings = (data?.settings ?? {}) as Record<string, unknown>

  return NextResponse.json({
    budget_alert_enabled: settings.budget_alert_enabled !== false,
    receipt_auto_classify_enabled: settings.receipt_auto_classify_enabled !== false,
  })
}

const PatchSchema = z.object({
  budget_alert_enabled: z.boolean().optional(),
  receipt_auto_classify_enabled: z.boolean().optional(),
})

// PATCH: 一部のフラグだけを更新（jsonbカラムなのでマージしてから書き戻す）
export async function PATCH(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response
  const { supabase, householdId } = auth

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: '不正なリクエストです' }, { status: 400 })
  }
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { data: current } = await supabase
    .from('households')
    .select('settings')
    .eq('id', householdId)
    .single()

  const merged = { ...(current?.settings as Record<string, unknown> ?? {}), ...parsed.data }

  const { error } = await supabase
    .from('households')
    .update({ settings: merged })
    .eq('id', householdId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    budget_alert_enabled: merged.budget_alert_enabled !== false,
    receipt_auto_classify_enabled: merged.receipt_auto_classify_enabled !== false,
  })
}
