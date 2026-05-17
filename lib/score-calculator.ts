import type { SupabaseClient } from '@supabase/supabase-js'

interface ScoreDetail {
  budget_items: Array<{
    category_name: string
    budget: number
    actual: number
    ratio: number
    within_budget: boolean
  }>
  saving_categories: number
  all_within_budget: boolean
  beat_last_month: boolean
  three_month_streak: boolean
}

function calcGrade(score: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  if (score >= 90) return 'S'
  if (score >= 70) return 'A'
  if (score >= 60) return 'B'
  if (score >= 40) return 'C'
  return 'D'
}

export async function recalculateScore(
  supabase: SupabaseClient,
  householdId: string,
  monthStr: string  // 'YYYY-MM'
): Promise<void> {
  const monthDate = `${monthStr}-01`

  // is_finalized の月は更新しない
  const { data: existing } = await supabase
    .from('monthly_scores')
    .select('is_finalized')
    .eq('household_id', householdId)
    .eq('month', monthDate)
    .maybeSingle()

  if (existing?.is_finalized) return

  const [y, m] = monthStr.split('-').map(Number)
  const nextMonthDate = m === 12
    ? `${y + 1}-01-01`
    : `${y}-${String(m + 1).padStart(2, '0')}-01`

  // 当月取引（支出のみ）をカテゴリ別集計
  const { data: transactions } = await supabase
    .from('transactions')
    .select('amount, category_id, categories(name)')
    .eq('household_id', householdId)
    .lt('amount', 0)
    .gte('occurred_on', monthDate)
    .lt('occurred_on', nextMonthDate)

  const actualByCategory: Record<string, { name: string; total: number }> = {}
  for (const tx of transactions ?? []) {
    const name = (tx.categories as unknown as { name: string } | null)?.name ?? '未分類'
    const key = tx.category_id ?? 'uncategorized'
    if (!actualByCategory[key]) actualByCategory[key] = { name, total: 0 }
    actualByCategory[key].total += Math.abs(tx.amount)
  }

  // budgets テーブルから当月予算を取得
  const { data: budgets } = await supabase
    .from('budgets')
    .select('category_id, amount, categories(name)')
    .eq('household_id', householdId)
    .eq('month', monthDate)

  // 先月スコア（ボーナス計算用）
  const prevMonthDate = m === 1
    ? `${y - 1}-12-01`
    : `${y}-${String(m - 1).padStart(2, '0')}-01`
  const { data: prevScore } = await supabase
    .from('monthly_scores')
    .select('score')
    .eq('household_id', householdId)
    .eq('month', prevMonthDate)
    .maybeSingle()

  // ── 予算達成点（最大60点） ──
  let budgetScore = 0
  const budgetItems: ScoreDetail['budget_items'] = []
  let allWithinBudget = true

  for (const b of budgets ?? []) {
    const actual = actualByCategory[b.category_id]?.total ?? 0
    const budget = b.amount
    const ratio = budget > 0 ? actual / budget : 0
    const catName = (b.categories as unknown as { name: string } | null)?.name ?? '未分類'

    let points = 0
    if (ratio <= 1.0) points = 1
    else if (ratio <= 1.1) points = 0.5
    // ratio > 1.1 → 0点

    budgetScore += points
    if (ratio > 1.0) allWithinBudget = false

    budgetItems.push({
      category_name: catName,
      budget,
      actual,
      ratio: Math.round(ratio * 100) / 100,
      within_budget: ratio <= 1.0,
    })
  }

  const budgetCount = (budgets ?? []).length
  const budgetScoreNorm = budgetCount > 0
    ? Math.round((budgetScore / budgetCount) * 60)
    : 0

  // ── 節約行動点（最大30点）: 先月比でカテゴリ支出が減った数 × 3点 ──
  let savingScore = 0
  let savingCategories = 0

  const { data: prevTransactions } = await supabase
    .from('transactions')
    .select('amount, category_id')
    .eq('household_id', householdId)
    .lt('amount', 0)
    .gte('occurred_on', prevMonthDate)
    .lt('occurred_on', monthDate)

  const prevByCategory: Record<string, number> = {}
  for (const tx of prevTransactions ?? []) {
    const key = tx.category_id ?? 'uncategorized'
    prevByCategory[key] = (prevByCategory[key] ?? 0) + Math.abs(tx.amount)
  }

  for (const [catId, curr] of Object.entries(actualByCategory)) {
    const prev = prevByCategory[catId] ?? 0
    if (prev > 0 && curr.total < prev) {
      savingCategories++
      savingScore = Math.min(savingScore + 3, 30)
    }
  }

  // ── ボーナス点（最大10点） ──
  let bonusScore = 0
  const beatLastMonth = prevScore ? budgetScoreNorm + savingScore > prevScore.score : false

  if (allWithinBudget && budgetCount > 0) bonusScore += 5
  if (beatLastMonth) bonusScore += 3

  // 3ヶ月連続入力チェック（直近2ヶ月に取引があるか）
  const twoMonthsAgo = m <= 2
    ? `${y - 1}-${String(m + 10).padStart(2, '0')}-01`
    : `${y}-${String(m - 2).padStart(2, '0')}-01`
  const { count: recentCount } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('household_id', householdId)
    .gte('occurred_on', twoMonthsAgo)
    .lt('occurred_on', monthDate)

  const threeMonthStreak = (recentCount ?? 0) > 0
  if (threeMonthStreak) bonusScore += 2

  bonusScore = Math.min(bonusScore, 10)

  const totalScore = Math.min(budgetScoreNorm + savingScore + bonusScore, 100)

  const detail: ScoreDetail = {
    budget_items: budgetItems,
    saving_categories: savingCategories,
    all_within_budget: allWithinBudget,
    beat_last_month: beatLastMonth,
    three_month_streak: threeMonthStreak,
  }

  await supabase.from('monthly_scores').upsert(
    {
      household_id: householdId,
      month: monthDate,
      score: totalScore,
      budget_score: budgetScoreNorm,
      saving_score: savingScore,
      bonus_score: bonusScore,
      score_grade: calcGrade(totalScore),
      score_detail: detail,
      calculated_at: new Date().toISOString(),
    },
    { onConflict: 'household_id,month' }
  )
}
