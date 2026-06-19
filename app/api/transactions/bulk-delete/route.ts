import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-guard'
import { jstMonthStr } from '@/lib/jst'
import { z } from 'zod'
import { recalculateScore } from '@/lib/score-calculator'

const Schema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
})

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const { supabase, householdId } = auth

  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { ids } = parsed.data

  // 対象行が自世帯に属するか確認してから削除
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('household_id', householdId)
    .in('id', ids)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // スコア再計算（今月分）
  const month = jstMonthStr()
  void recalculateScore(supabase, householdId, month)

  return NextResponse.json({ deleted: ids.length })
}
