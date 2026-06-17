/**
 * Vercel Cron: 月初処理
 * Schedule: 毎月1日 00:01 JST (UTC 15:01 前日) → vercel.json: "1 15 1 * *"
 *
 * 処理順序:
 * ① 前月スコアを is_finalized = true に更新
 * ② 前月の月次サマリー生成 → monthly_summaries に保存（Sonnet）
 * ③ 当月の予算提案生成 → budget_suggestions に保存（Haiku）
 * ④ category_rag の confidence 自然減衰（×0.95）
 * ⑤ 固定費候補を SQL 集計で検出 → fixed_expense_suggestions UPSERT
 * ⑥ 90日超過の api_error_logs を削除
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateMonthlySummary } from '@/lib/monthly-summary'
import { generateBudgetAdvice } from '@/lib/budget-advisor'
import { sendPushToHousehold } from '@/lib/push-sender'
import { normalizeKeyword } from '@/lib/ai-classifier'
import { canonicalizeMerchant } from '@/lib/merchant-canonical'

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

  const supabase = createAdminClient()

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

    // ④ category_rag confidence 自然減衰（×0.95）
    try {
      const { error } = await supabase.rpc('decay_category_rag_confidence', { p_household_id: hid })
      if (error) throw error
      steps['confidence_decay'] = 'ok'
    } catch (err) {
      const msg = err instanceof Error ? err.message : '不明なエラー'
      steps['confidence_decay'] = `error: ${msg}`
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
        // 表記揺れを吸収するため canonicalizeMerchant(normalizeKeyword(payee)) で集約。
        // 代表 payee は最頻出の元 payee を保持。
        const payeeStats = new Map<string, {
          amounts: number[]
          months: Set<string>
          originalPayees: Map<string, number>
        }>()
        for (const tx of candidates) {
          const key = canonicalizeMerchant(normalizeKeyword(tx.payee)) || tx.payee
          if (!payeeStats.has(key)) {
            payeeStats.set(key, { amounts: [], months: new Set(), originalPayees: new Map() })
          }
          const stat = payeeStats.get(key)!
          stat.amounts.push(Math.abs(tx.amount))
          stat.months.add(tx.occurred_on.slice(0, 7))
          stat.originalPayees.set(tx.payee, (stat.originalPayees.get(tx.payee) ?? 0) + 1)
        }

        const fixedCandidates = [...payeeStats.entries()]
          .filter(([, stat]) => stat.months.size >= 3)
          .map(([, stat]) => {
            const topPayee = [...stat.originalPayees.entries()].sort((a, b) => b[1] - a[1])[0][0]
            return {
              household_id: hid,
              payee: topPayee,
              avg_amount: Math.round(stat.amounts.reduce((a, b) => a + b, 0) / stat.amounts.length),
              months_seen: stat.months.size,
              updated_at: new Date().toISOString(),
            }
          })

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

    // ⑧ 支出異常検知（前3ヶ月平均との乖離が ±30% 以上のカテゴリをflag）
    try {
      // 対象: 前月（スコア確定直後）
      const targetMonth = `${prevYear}-${String(pMonth).padStart(2, '0')}-01`

      // 当月カテゴリ別支出
      const { data: txCur } = await supabase
        .from('transactions')
        .select('amount, categories(id, name)')
        .eq('household_id', hid)
        .gte('occurred_on', monthDate(prevYear, pMonth))
        .lt('occurred_on', monthDate(curYear, curMonth))
        .lt('amount', 0)

      if (txCur?.length) {
        // 前3ヶ月（前月を除く）の支出を集計
        const refStart = new Date(prevYear, pMonth - 4, 1)
        const refEnd   = new Date(prevYear, pMonth - 1, 1)
        const refStartStr = refStart.toISOString().slice(0, 10)
        const refEndStr   = refEnd.toISOString().slice(0, 10)

        const { data: txRef } = await supabase
          .from('transactions')
          .select('amount, occurred_on, categories(id, name)')
          .eq('household_id', hid)
          .gte('occurred_on', refStartStr)
          .lt('occurred_on', refEndStr)
          .lt('amount', 0)

        // カテゴリ別集計（current）
        type CatStat = { id: string; name: string; amount: number }
        const curMap = new Map<string, CatStat>()
        for (const tx of txCur) {
          const cat = tx.categories as unknown as { id: string; name: string } | null
          if (!cat) continue
          const s = curMap.get(cat.id) ?? { id: cat.id, name: cat.name, amount: 0 }
          s.amount += Math.abs(tx.amount)
          curMap.set(cat.id, s)
        }

        // カテゴリ別月次集計（reference 3ヶ月分）
        // month → catId → amount のマップ（データがない月はエントリなし）
        const refMonthMap = new Map<string, Map<string, number>>()
        for (const tx of txRef ?? []) {
          const cat = tx.categories as unknown as { id: string; name: string } | null
          if (!cat) continue
          const mo = (tx as { occurred_on: string }).occurred_on.slice(0, 7)
          if (!refMonthMap.has(mo)) refMonthMap.set(mo, new Map())
          const mmap = refMonthMap.get(mo)!
          mmap.set(cat.id, (mmap.get(cat.id) ?? 0) + Math.abs(tx.amount))
        }
        const refMonths = [...refMonthMap.values()]
        // 参照期間の「カレンダー上の月数」で割る（データがない月も0として扱う）
        // refStart〜refEnd の期間は常に3ヶ月（世帯開設直後でも固定3で割る）
        const REF_PERIOD_MONTHS = 3

        // 乖離判定
        const flags: Array<{
          household_id: string; month: string
          category_id: string; category_name: string
          actual_amount: number; expected_amount: number
          deviation_rate: number; anomaly_type: string
        }> = []

        for (const [catId, cur] of curMap) {
          if (refMonths.length === 0) continue
          // データがある月だけの合計を参照期間の月数（3）で割って平均を求める
          const total = refMonths.reduce((s, m) => s + (m.get(catId) ?? 0), 0)
          const avg = Math.round(total / REF_PERIOD_MONTHS)
          if (avg === 0) continue  // 参照期間に実績なし → skip
          const dev = (cur.amount - avg) / avg
          if (Math.abs(dev) < 0.30) continue
          flags.push({
            household_id: hid,
            month: targetMonth,
            category_id: catId,
            category_name: cur.name,
            actual_amount: cur.amount,
            expected_amount: avg,
            deviation_rate: Math.round(dev * 10000) / 10000,
            anomaly_type: dev > 0 ? 'spike' : 'drop',
          })
        }

        if (flags.length) {
          await supabase
            .from('monthly_anomaly_flags')
            .upsert(flags, { onConflict: 'household_id,month,category_id' })
        }
      }
      steps['anomaly_detection'] = 'ok'
    } catch (err) {
      steps['anomaly_detection'] = `error: ${err instanceof Error ? err.message : '不明'}`
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

    // ⑦ 頻出修正履歴を RAG キャッシュへ昇格（同 payee→category が 3 回以上）
    try {
      const { data: corrRows } = await supabase
        .from('category_corrections')
        .select('payee_key, new_category_id')
        .eq('household_id', hid)

      if (corrRows?.length) {
        const counts = new Map<string, { new_category_id: string; count: number }>()
        for (const row of corrRows) {
          const key = `${row.payee_key}::${row.new_category_id}`
          const entry = counts.get(key)
          if (entry) { entry.count++ } else {
            counts.set(key, { new_category_id: row.new_category_id, count: 1 })
          }
        }

        const toPromote = [...counts.entries()]
          .filter(([, v]) => v.count >= 3)
          .map(([k, v]) => ({
            household_id: hid,
            payee_key: k.split('::')[0],
            category_id: v.new_category_id,
            confidence: 0.95,
            hit_count: v.count,
            last_seen: new Date().toISOString().slice(0, 10),
          }))

        if (toPromote.length) {
          await supabase
            .from('category_rag')
            .upsert(toPromote, { onConflict: 'household_id,payee_key' })
        }
      }
      steps['promote_corrections'] = 'ok'
    } catch (err) {
      steps['promote_corrections'] = `error: ${err instanceof Error ? err.message : '不明'}`
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
