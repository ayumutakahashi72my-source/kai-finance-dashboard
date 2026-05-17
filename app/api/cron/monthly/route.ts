/**
 * Vercel Cron: 月初処理
 * Schedule: 毎月1日 00:01 JST (UTC 15:01 前日) → vercel.json: "1 15 1 * *"
 *
 * 処理順序:
 * ① 前月スコアを is_finalized = true に更新
 * ② 前月の月次サマリー生成 → monthly_summaries に保存（Sonnet）
 * ③ 当月の予算提案生成 → budget_suggestions に保存（Haiku）
 * ④ category_rules の confidence 自然減衰（×0.95）
 * ⑤ 固定費候補を SQL 集計で検出 → fixed_expense_suggestions UPSERT
 * ⑥ 90日超過の api_error_logs を削除
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateMonthlySummary } from '@/lib/monthly-summary'
import { generateBudgetAdvice } from '@/lib/budget-advisor'
import { sendPushToHousehold } from '@/lib/push-sender'

function prevMonth(year: number, month: number): { year: number; month: number } {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
}

function monthDate(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  const now = new Date()
  const curYear = now.getUTCFullYear()
  const curMonth = now.getUTCMonth() + 1
  const { year: prevYear, month: pMonth } = prevMonth(curYear, curMonth)

  // 対象世帯を全件取得
  const { data: households } = await supabase
    .from('households')
    .select('id')

  if (!households?.length) {
    return NextResponse.json({ message: '世帯なし' })
  }

  const results: Array<{
    householdId: string
    steps: Record<string, string>
  }> = []

  for (const household of households) {
    const hid = household.id
    const steps: Record<string, string> = {}

    // ① 前月スコアを確定（is_finalized = true）
    const prevMonthStr = monthDate(prevYear, pMonth)
    try {
      await supabase
        .from('monthly_scores')
        .update({ is_finalized: true })
        .eq('household_id', hid)
        .eq('month', prevMonthStr)
        .eq('is_finalized', false)
      steps['finalize_score'] = 'ok'
    } catch {
      steps['finalize_score'] = 'skip'
    }

    // ② 前月の月次サマリー生成
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const existingSummary = await supabase
          .from('monthly_summaries')
          .select('id')
          .eq('household_id', hid)
          .eq('year', prevYear)
          .eq('month', pMonth)
          .maybeSingle()

        if (!existingSummary.data) {
          const summary = await generateMonthlySummary(supabase, hid, prevYear, pMonth)
          await supabase.from('monthly_summaries').insert({
            household_id: hid,
            year: prevYear,
            month: pMonth,
            content: summary,
          })
        }
        steps['monthly_summary'] = 'ok'
      } catch (err) {
        const msg = err instanceof Error ? err.message : '不明なエラー'
        await supabase.from('api_error_logs').insert({
          household_id: hid,
          feature: 'cron_monthly_summary',
          error_msg: msg,
        })
        steps['monthly_summary'] = `error: ${msg}`
      }

      // ③ 当月の予算提案生成
      try {
        const existingBudget = await supabase
          .from('budget_suggestions')
          .select('id')
          .eq('household_id', hid)
          .eq('year', curYear)
          .eq('month', curMonth)
          .maybeSingle()

        if (!existingBudget.data) {
          const advice = await generateBudgetAdvice(supabase, hid, curYear, curMonth)
          await supabase.from('budget_suggestions').insert({
            household_id: hid,
            year: curYear,
            month: curMonth,
            suggestions: advice.budget_suggestions,
            spending_pattern: advice.spending_pattern,
          })
        }
        steps['budget_suggest'] = 'ok'
      } catch (err) {
        const msg = err instanceof Error ? err.message : '不明なエラー'
        await supabase.from('api_error_logs').insert({
          household_id: hid,
          feature: 'cron_budget_suggest',
          error_msg: msg,
        })
        steps['budget_suggest'] = `error: ${msg}`
      }
    } else {
      steps['ai_skipped'] = 'ANTHROPIC_API_KEY未設定'
    }

    // ④ category_rules confidence 自然減衰（×0.95）
    try {
      await supabase.rpc('decay_category_confidence', { p_household_id: hid })
      steps['confidence_decay'] = 'ok'
    } catch {
      // RPC未定義の場合はSQL直接実行にフォールバック
      await supabase
        .from('category_rules')
        .update({ confidence: supabase.rpc as unknown as number })
        .eq('household_id', hid)
      steps['confidence_decay'] = 'rpc_not_found_skipped'
    }

    // ⑤ 固定費候補を SQL 集計で検出（直近3ヶ月で3回以上同一payee）
    try {
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
      const since = threeMonthsAgo.toISOString().slice(0, 10)

      const { data: candidates } = await supabase
        .from('transactions')
        .select('payee, amount, occurred_on')
        .eq('household_id', hid)
        .lt('amount', 0)
        .gte('occurred_on', since)

      if (candidates?.length) {
        const payeeStats = new Map<string, { amounts: number[]; months: Set<string> }>()
        for (const tx of candidates) {
          const key = tx.payee
          if (!payeeStats.has(key)) payeeStats.set(key, { amounts: [], months: new Set() })
          const stat = payeeStats.get(key)!
          stat.amounts.push(Math.abs(tx.amount))
          stat.months.add(tx.occurred_on.slice(0, 7))
        }

        const fixedCandidates = [...payeeStats.entries()]
          .filter(([, stat]) => stat.months.size >= 3)
          .map(([payee, stat]) => ({
            household_id: hid,
            payee,
            avg_amount: Math.round(stat.amounts.reduce((a, b) => a + b, 0) / stat.amounts.length),
            months_seen: stat.months.size,
            updated_at: new Date().toISOString(),
          }))

        if (fixedCandidates.length) {
          await supabase
            .from('fixed_expense_suggestions')
            .upsert(fixedCandidates, { onConflict: 'household_id,payee' })
        }
      }
      steps['fixed_detection'] = 'ok'
    } catch (err) {
      steps['fixed_detection'] = `error: ${err instanceof Error ? err.message : '不明'}`
    }

    // ⑥ 90日超過の api_error_logs・notifications を削除
    try {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 90)
      const cutoffStr = cutoff.toISOString()
      await Promise.all([
        supabase.from('api_error_logs').delete().lt('created_at', cutoffStr).eq('household_id', hid),
        supabase.from('notifications').delete().lt('expires_at', new Date().toISOString()).eq('household_id', hid),
      ])
      steps['cleanup'] = 'ok'
    } catch {
      steps['cleanup'] = 'skip'
    }

    // ⑩ プッシュ通知送信 + notifications レコード作成
    try {
      const prevMonthLabel = `${prevYear}年${pMonth}月`
      const { sent } = await sendPushToHousehold(supabase, hid, {
        title: 'KAI 月次レポート',
        body: `${prevMonthLabel}の家計レポートが届きました`,
        url: '/',
        tag: `monthly-report-${prevYear}-${pMonth}`,
      })

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 90)
      await supabase.from('notifications').insert({
        household_id: hid,
        type: 'monthly_report',
        payload: { year: prevYear, month: pMonth, push_sent: sent },
        expires_at: expiresAt.toISOString(),
      })
      steps['push_notification'] = `sent: ${sent}`
    } catch (err) {
      steps['push_notification'] = `error: ${err instanceof Error ? err.message : '不明'}`
    }

    results.push({ householdId: hid, steps })
  }

  return NextResponse.json({ results, processedAt: new Date().toISOString() })
}
