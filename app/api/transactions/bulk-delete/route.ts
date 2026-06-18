import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-guard'
import { z } from 'zod'
import { recalculateScore } from '@/lib/score-calculator'
import { jstMonthStr } from '@/lib/jst'

const Schema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
})

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const { supabase, householdId } = auth

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'リクエスト本文が不正です' }, { status: 400 }) }
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { ids } = parsed.data

  // 削除対象の月を先に取得（スコア再計算用）
  const { data: targets } = await supabase
    .from('transactions')
    .select('occurred_on')
    .eq('household_id', householdId)
    .in('id', ids)

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('household_id', householdId)
    .in('id', ids)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 影響を受けた月すべてのスコアを再計算
  const months = new Set(
    (targets ?? []).map((t) => t.occurred_on.slice(0, 7))
  )
  if (months.size === 0) months.add(jstMonthStr())
  for (const m of months) {
    void recalculateScore(supabase, householdId, m)
  }

  return NextResponse.json({ deleted: ids.length })
}
