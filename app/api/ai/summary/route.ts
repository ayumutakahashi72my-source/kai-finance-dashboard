import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateMonthlySummary } from '@/lib/monthly-summary'
import { FALLBACK } from '@/lib/fallback-messages'

async function getHouseholdId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', userId)
    .limit(1)
    .single()
  return data?.household_id ?? null
}

// GET: 月次サマリーを返す
// ?list=true → 存在する年月一覧
// ?year=YYYY&month=MM → 指定月のサマリー
// (パラメータなし) → 最新のサマリー
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const householdId = await getHouseholdId(supabase, user.id)
  if (!householdId) return NextResponse.json({ error: '世帯が見つかりません' }, { status: 400 })

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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const householdId = await getHouseholdId(supabase, user.id)
  if (!householdId) return NextResponse.json({ error: '世帯が見つかりません' }, { status: 400 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI機能が設定されていません' }, { status: 503 })
  }

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

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
