import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-guard'
import { jstNow } from '@/lib/jst'
import { generateMonthlySummary } from '@/lib/monthly-summary'
import { FALLBACK } from '@/lib/fallback-messages'

// GET: 月次サマリーを返す
// ?list=true → 存在する年月一覧
// ?year=YYYY&month=MM → 指定月のサマリー
// (パラメータなし) → 最新のサマリー
export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const { supabase, householdId } = auth
  const { searchParams } = new URL(req.url)

  if (searchParams.get('list') === 'true') {
    const { data } = await supabase
      .from('monthly_summaries')
      .select('year, month, created_at')
      .eq('household_id', householdId)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
    return NextResponse.json({ data: data ?? [] })
  }

  const yearParam = searchParams.get('year')
  const monthParam = searchParams.get('month')

  if (yearParam && monthParam) {
    const { data } = await supabase
      .from('monthly_summaries')
      .select('year, month, content, created_at')
      .eq('household_id', householdId)
      .eq('year', parseInt(yearParam, 10))
      .eq('month', parseInt(monthParam, 10))
      .maybeSingle()
    return NextResponse.json({ data })
  }

  const { data } = await supabase
    .from('monthly_summaries')
    .select('year, month, content, created_at')
    .eq('household_id', householdId)
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ data })
}

// POST: 今月分を生成（月1回制限）
export async function POST() {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const { supabase, householdId } = auth

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI機能が設定されていません' }, { status: 503 })
  }

  const now = jstNow()
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth() + 1

  let content: string
  try {
    content = await generateMonthlySummary(supabase, householdId, year, month)
  } catch (err) {
    const error_msg = err instanceof Error ? err.message : '不明なエラー'
    await supabase.from('api_error_logs').insert({
      household_id: householdId,
      feature: 'monthly_summary',
      error_msg,
    })
    return NextResponse.json({ error: FALLBACK.budget }, { status: 500 })
  }

  const { error: dbError } = await supabase.from('monthly_summaries').upsert(
    { household_id: householdId, year, month, content, created_at: new Date().toISOString() },
    { onConflict: 'household_id,year,month' }
  )

  if (dbError) {
    return NextResponse.json({ error: `保存失敗: ${dbError.message}` }, { status: 500 })
  }

  return NextResponse.json({ data: { year, month, content } })
}
