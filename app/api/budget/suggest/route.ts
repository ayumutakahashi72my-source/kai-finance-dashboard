import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-guard'
import { jstNow } from '@/lib/jst'
import { generateBudgetAdvice } from '@/lib/budget-advisor'
import { FALLBACK } from '@/lib/fallback-messages'

// GET: 最新の予算提案を返す
export async function GET() {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const { supabase, householdId } = auth

  const { data } = await supabase
    .from('budget_suggestions')
    .select('year, month, suggestions, spending_pattern, created_at')
    .eq('household_id', householdId)
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ data })
}

// POST: 今月分を生成（?force=true で再生成可）
export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const { supabase, householdId } = auth

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI機能が設定されていません' }, { status: 503 })
  }

  const force = new URL(req.url).searchParams.get('force') === 'true'
  const now = jstNow()
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth() + 1

  const { data: existing } = await supabase
    .from('budget_suggestions')
    .select('id')
    .eq('household_id', householdId)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle()

  if (existing) {
    if (!force) {
      return NextResponse.json(
        { error: '今月分の予算提案はすでに生成済みです（再生成する場合は再生成ボタンを押してください）' },
        { status: 409 }
      )
    }
    await supabase.from('budget_suggestions').delete().eq('id', existing.id)
  }

  let advice
  try {
    advice = await generateBudgetAdvice(supabase, householdId, year, month)
  } catch (err) {
    const error_msg = err instanceof Error ? err.message : '不明なエラー'
    await supabase.from('api_error_logs').insert({
      household_id: householdId,
      feature: 'budget_suggest',
      error_msg,
    })
    return NextResponse.json(
      { error: FALLBACK.budget },
      { status: 500 }
    )
  }

  const { error: dbError } = await supabase.from('budget_suggestions').insert({
    household_id: householdId,
    year,
    month,
    suggestions: advice.budget_suggestions,
    spending_pattern: advice.spending_pattern,
  })

  if (dbError) {
    return NextResponse.json({ error: `保存失敗: ${dbError.message}` }, { status: 500 })
  }

  return NextResponse.json({ data: { year, month, ...advice } })
}
