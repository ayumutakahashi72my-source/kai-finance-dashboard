import type { SupabaseClient } from '@supabase/supabase-js'
import { sendPushToHousehold } from './push-sender'
import { jstMonthStr } from './jst'

/**
 * カテゴリ予算の90%到達を検知し、世帯にプッシュ通知を送る。
 * 取引作成の都度呼ばれる想定（1〜数カテゴリの軽量チェック）。
 * households.settings.budget_alert_enabled === false の場合は何もしない（既定は有効）。
 * 同じ月・カテゴリで一度送ったら再送しない（notifications テーブルで判定）。
 */
export async function checkAndSendBudgetAlerts(
  supabase: SupabaseClient,
  householdId: string,
  categoryIds: (string | null | undefined)[],
): Promise<void> {
  const uniqueCatIds = [...new Set(categoryIds.filter((id): id is string => !!id))]
  if (!uniqueCatIds.length) return

  const { data: household } = await supabase
    .from('households')
    .select('settings')
    .eq('id', householdId)
    .single()
  const settings = (household?.settings ?? {}) as Record<string, unknown>
  if (settings.budget_alert_enabled === false) return

  const monthStr = jstMonthStr()
  const [year, month] = monthStr.split('-').map(Number)

  const { data: bs } = await supabase
    .from('budget_suggestions')
    .select('suggestions')
    .eq('household_id', householdId)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle()
  const suggestions = (bs?.suggestions ?? []) as { category_name: string; suggested_amount: number }[]
  if (!suggestions.length) return

  const { data: cats } = await supabase
    .from('categories')
    .select('id, name')
    .in('id', uniqueCatIds)
  const catNameMap = new Map((cats ?? []).map((c) => [c.id as string, c.name as string]))

  // 当月分のみ集計（上限がないと未来日付の取引が当月アラートに混入する）
  const nextMonthStr = month === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 1).padStart(2, '0')}-01`
  const { data: txs } = await supabase
    .from('transactions')
    .select('category_id, amount')
    .eq('household_id', householdId)
    .eq('excluded', false)
    .lt('amount', 0)
    .gte('occurred_on', `${monthStr}-01`)
    .lt('occurred_on', nextMonthStr)
    .in('category_id', uniqueCatIds)

  const spentByCategory = new Map<string, number>()
  for (const t of txs ?? []) {
    const catId = t.category_id as string | null
    if (!catId) continue
    spentByCategory.set(catId, (spentByCategory.get(catId) ?? 0) + Math.abs(t.amount as number))
  }

  for (const catId of uniqueCatIds) {
    const name = catNameMap.get(catId)
    if (!name) continue
    const suggestion = suggestions.find((s) => s.category_name === name)
    if (!suggestion || suggestion.suggested_amount <= 0) continue

    const spent = spentByCategory.get(catId) ?? 0
    const ratio = spent / suggestion.suggested_amount
    if (ratio < 0.90) continue

    // limit(1) で存在確認（maybeSingle は該当2行以上でエラー→再送につながる）
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('household_id', householdId)
      .eq('type', 'budget_alert')
      .contains('payload', { month: monthStr, category_id: catId })
      .limit(1)
    if (existing?.length) continue

    const pct = Math.round(ratio * 100)
    const { sent } = await sendPushToHousehold(supabase, householdId, {
      title: '予算超過アラート',
      body: `「${name}」が予算の${pct}%に達しました（¥${spent.toLocaleString('ja-JP')} / ¥${suggestion.suggested_amount.toLocaleString('ja-JP')}）`,
      url: '/budget',
      tag: `budget-alert-${monthStr}-${catId}`,
    })

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)
    await supabase.from('notifications').insert({
      household_id: householdId,
      type: 'budget_alert',
      payload: { month: monthStr, category_id: catId, category_name: name, ratio, push_sent: sent },
      expires_at: expiresAt.toISOString(),
    })
  }
}
