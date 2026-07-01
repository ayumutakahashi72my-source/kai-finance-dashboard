import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-guard'
import { calculateGoalBudget } from '@/lib/goal-advisor'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const { supabase, householdId } = auth
  const { id } = await params

  const { data: goal } = await supabase
    .from('financial_goals')
    .select('id, name, target_amount, deadline, last_calculated_at')
    .eq('id', id)
    .eq('household_id', householdId)
    .eq('is_active', true)
    .single()

  if (!goal) {
    return NextResponse.json({ error: '目標が見つかりません' }, { status: 404 })
  }

  // レート制限: 直近 1 時間以内に試算済みなら拒否
  if (goal.last_calculated_at) {
    const elapsedMs = Date.now() - new Date(goal.last_calculated_at).getTime()
    if (elapsedMs < 60 * 60 * 1000) {
      const remainMin = Math.ceil((60 * 60 * 1000 - elapsedMs) / 60000)
      return NextResponse.json(
        { error: `直近の試算から間もないため実行できません（あと約 ${remainMin} 分後に再実行可能）` },
        { status: 429 }
      )
    }
  }

  // 過去3ヶ月の収支集計
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  const since = threeMonthsAgo.toISOString().slice(0, 10)

  const { data: txRows } = await supabase
    .from('transactions')
    .select('amount, categories(name)')
    .eq('household_id', householdId)
    .eq('excluded', false)
    .gte('occurred_on', since)

  let totalIncome  = 0
  let totalExpense = 0
  const catMap = new Map<string, number>()

  for (const tx of txRows ?? []) {
    if (tx.amount >= 0) {
      totalIncome += tx.amount
    } else {
      const abs = Math.abs(tx.amount)
      totalExpense += abs
      const cat = tx.categories as unknown as { name: string } | null
      const name = cat?.name ?? 'その他'
      catMap.set(name, (catMap.get(name) ?? 0) + abs)
    }
  }

  if ((txRows ?? []).length === 0 || totalIncome === 0) {
    return NextResponse.json(
      { error: '取引データが不足しています。CSV 取込か MF 連携で 1 ヶ月以上の取引を取り込んだ後にお試しください。' },
      { status: 400 }
    )
  }

  const avgMonthlyIncome  = Math.round(totalIncome  / 3)
  const avgMonthlyExpense = Math.round(totalExpense / 3)

  const topCategories = [...catMap.entries()]
    .map(([name, amount]) => ({ name, amount: Math.round(amount / 3) }))
    .sort((a, b) => b.amount - a.amount)

  const advice = await calculateGoalBudget(
    {
      targetAmount:      goal.target_amount,
      deadline:          goal.deadline,
      avgMonthlyIncome,
      avgMonthlyExpense,
      topCategories,
    },
    supabase,
    householdId
  )

  const { data: updated, error } = await supabase
    .from('financial_goals')
    .update({
      monthly_savings_target:       advice.monthly_savings_target,
      monthly_spending_limit:       advice.monthly_spending_limit,
      risk_level:                   advice.risk_level,
      advice:                       advice.advice,
      suggested_months_alternative: advice.suggested_months_alternative,
      plan_steps:                   advice.plan_steps,
      last_calculated_at:           new Date().toISOString(),
      updated_at:                   new Date().toISOString(),
    })
    .eq('id', id)
    .eq('household_id', householdId)
    .select('id, name, target_amount, deadline, monthly_savings_target, monthly_spending_limit, risk_level, advice, suggested_months_alternative, plan_steps, updated_at')
    .single()

  if (error || !updated) {
    return NextResponse.json({ error: error?.message ?? '更新に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ goal: updated })
}
