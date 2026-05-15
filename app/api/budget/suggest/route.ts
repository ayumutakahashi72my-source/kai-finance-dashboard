import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateBudgetAdvice } from '@/lib/budget-advisor'
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

// GET: 最新の予算提案を返す
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const householdId = await getHouseholdId(supabase, user.id)
  if (!householdId) return NextResponse.json({ error: '世帯が見つかりません' }, { status: 400 })

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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const householdId = await getHouseholdId(supabase, user.id)
  if (!householdId) return NextResponse.json({ error: '世帯が見つかりません' }, { status: 400 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI機能が設定されていません' }, { status: 503 })
  }

  const force = new URL(req.url).searchParams.get('force') === 'true'
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

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
