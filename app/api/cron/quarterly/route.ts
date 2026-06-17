/**
 * Vercel Cron: 四半期深層分析
 * Schedule: 1/4/7/10月1日 UTC 15:00 = JST 翌0:00
 * vercel.json: "0 15 1 1,4,7,10 *"
 *
 * Opus 4 を使って過去3ヶ月の家計を深層分析し quarterly_insights に保存する。
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'
import { trackCost } from '@/lib/cost-tracker'
import { getEnvKey } from '@/lib/api-keys'

function quarterOf(month: number): number {
  return Math.ceil(month / 3)
}

async function buildQuarterContext(
  supabase: ReturnType<typeof createAdminClient>,
  householdId: string,
  year: number,
  quarter: number
): Promise<string> {
  const startMonth = (quarter - 1) * 3 + 1
  const endMonth   = startMonth + 2
  const since = `${year}-${String(startMonth).padStart(2, '0')}-01`
  // endMonth + 1 月の1日を計算（月末日が月によって異なるため lte より lt が安全）
  const nextMonthDate = new Date(Date.UTC(year, endMonth, 1)) // endMonth は 1-indexed → 0-indexed に+1不要（そのままで翌月になる）
  const until = nextMonthDate.toISOString().slice(0, 10)

  const { data: rows } = await supabase
    .from('transactions')
    .select('amount, payee, occurred_on, categories(name)')
    .eq('household_id', householdId)
    .gte('occurred_on', since)
    .lt('occurred_on', until)

  const catMap  = new Map<string, number>()
  const moMap   = new Map<string, { income: number; expense: number }>()
  let totalIncome = 0
  let totalExpense = 0

  for (const r of rows ?? []) {
    const cat  = (r.categories as unknown as { name: string } | null)?.name ?? 'その他'
    const mo   = (r.occurred_on as string).slice(0, 7)
    const abs  = Math.abs(r.amount)

    const entry = moMap.get(mo) ?? { income: 0, expense: 0 }
    if (r.amount >= 0) { totalIncome  += r.amount; entry.income  += r.amount }
    else               { totalExpense += abs;       entry.expense += abs; catMap.set(cat, (catMap.get(cat) ?? 0) + abs) }
    moMap.set(mo, entry)
  }

  const catLines = [...catMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([n, v]) => `${n}: ¥${v.toLocaleString()}`)
    .join(', ')

  const moLines = [...moMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mo, { income, expense }]) => `${mo}: 収入¥${income.toLocaleString()} 支出¥${expense.toLocaleString()}`)
    .join('\n')

  const saveRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0

  // 異常フラグを追加
  const { data: flags } = await supabase
    .from('monthly_anomaly_flags')
    .select('month, category_name, deviation_rate, anomaly_type')
    .eq('household_id', householdId)
    .gte('month', since)
    .lt('month', until)

  const flagLines = (flags ?? [])
    .map((f) => `${f.month}: ${f.category_name} ${f.anomaly_type === 'spike' ? '急増' : '急減'}(${Math.round(Number(f.deviation_rate) * 100)}%)`)
    .join(', ')

  return [
    `[${year}年 第${quarter}四半期（${since}〜${until}）家計データ]`,
    `総収入: ¥${totalIncome.toLocaleString()} | 総支出: ¥${totalExpense.toLocaleString()} | 貯蓄率: ${saveRate}%`,
    `カテゴリ別支出: ${catLines || 'なし'}`,
    `月別内訳:\n${moLines || 'なし'}`,
    flagLines ? `支出異常アラート: ${flagLines}` : '',
  ].filter(Boolean).join('\n')
}

const QUARTERLY_PROMPT = `あなたは家計の専門アドバイザーです。以下の四半期家計データを深層分析し、以下の構成で日本語のレポートを作成してください（合計700〜1000字程度）：

1. **四半期サマリー** — 収支バランスと貯蓄率の評価
2. **支出パターン分析** — カテゴリ別の傾向・変化・特徴
3. **改善ポイント（上位3件）** — 具体的で実行可能なアドバイス
4. **次の四半期へ向けて** — 優先すべき財務目標

数値は具体的に引用し、ポジティブな点も必ず含めてください。`

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY 未設定' }, { status: 503 })
  }

  const supabase = createAdminClient()
  const now = new Date()
  const curMonth = now.getUTCMonth() + 1

  // 前の四半期を対象（1日に実行されるので「今日の月」が新四半期の開始 → 前四半期を分析）
  const prevMonth = curMonth === 1 ? 12 : curMonth - 1
  const prevYear  = curMonth === 1 ? now.getUTCFullYear() - 1 : now.getUTCFullYear()
  const quarter   = quarterOf(prevMonth)

  const { data: households } = await supabase.from('households').select('id')
  if (!households?.length) return NextResponse.json({ message: '世帯なし' })

  const client = new Anthropic({ apiKey: getEnvKey('ANTHROPIC_API_KEY') })
  const results: Array<{ householdId: string; status: string }> = []

  for (const { id: hid } of households) {
    // 既存レコードがあればスキップ
    const { data: existing } = await supabase
      .from('quarterly_insights')
      .select('id')
      .eq('household_id', hid)
      .eq('year', prevYear)
      .eq('quarter', quarter)
      .maybeSingle()

    if (existing) { results.push({ householdId: hid, status: 'skip' }); continue }

    try {
      const context = await buildQuarterContext(supabase, hid, prevYear, quarter)

      const response = await client.messages.create({
        model: 'claude-opus-4-8',
        max_tokens: 1024,
        temperature: 0,
        messages: [{ role: 'user', content: `${QUARTERLY_PROMPT}\n\n${context}` }],
      })

      const content = response.content[0].type === 'text' ? response.content[0].text : ''

      await supabase.from('quarterly_insights').insert({
        household_id: hid,
        year: prevYear,
        quarter,
        content,
        model: 'claude-opus-4-8',
      })

      void trackCost({
        household_id: hid,
        model: 'claude-opus-4-8',
        feature: 'quarterly_insight',
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      }, supabase)

      results.push({ householdId: hid, status: 'ok' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : '不明'
      void supabase.from('api_error_logs').insert({
        household_id: hid,
        feature: 'cron_quarterly_insight',
        error_msg: msg,
      })
      results.push({ householdId: hid, status: `error: ${msg}` })
    }
  }

  return NextResponse.json({ results, processedAt: new Date().toISOString(), target: `${prevYear}Q${quarter}` })
}
