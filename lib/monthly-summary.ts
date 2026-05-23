import { getEnvKey } from '@/lib/api-keys'
import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import { retryWithBackoff } from './retry'
import { trackCost } from './cost-tracker'

async function buildMonthContext(
  supabase: SupabaseClient,
  householdId: string,
  year: number,
  month: number
): Promise<string> {
  const since = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const until = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const { data: rows } = await supabase
    .from('transactions')
    .select('amount, payee, categories(name)')
    .eq('household_id', householdId)
    .gte('occurred_on', since)
    .lte('occurred_on', until)

  const catMap = new Map<string, number>()
  const payeeMap = new Map<string, number>()
  let income = 0
  let expense = 0

  for (const r of rows ?? []) {
    if (r.amount > 0) {
      income += r.amount
    } else {
      const abs = Math.abs(r.amount)
      expense += abs
      const cat = r.categories as unknown as { name: string } | null
      const name = cat?.name ?? 'その他'
      catMap.set(name, (catMap.get(name) ?? 0) + abs)
      payeeMap.set(r.payee, (payeeMap.get(r.payee) ?? 0) + abs)
    }
  }

  const catLines = [...catMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, total]) => `- ${name}: ¥${total.toLocaleString()}`)
    .join('\n')

  const top10 = [...payeeMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([payee, total], i) => `${i + 1}. ${payee}: ¥${total.toLocaleString()}`)
    .join('\n')

  return `${year}年${month}月の家計データ:
収入合計: ¥${income.toLocaleString()}
支出合計: ¥${expense.toLocaleString()}
収支: ¥${(income - expense).toLocaleString()}

カテゴリ別支出:
${catLines || '（データなし）'}

支出上位店舗:
${top10 || '（データなし）'}`
}

export async function generateMonthlySummary(
  supabase: SupabaseClient,
  householdId: string,
  year: number,
  month: number
): Promise<string> {
  const client = new Anthropic({ apiKey: getEnvKey('ANTHROPIC_API_KEY') })
  const context = await buildMonthContext(supabase, householdId, year, month)

  const response = await retryWithBackoff(
    () =>
      client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `${context}\n\n上記データをもとに、家計の月次レポートを300字程度で作成してください。良かった点・改善点・来月へのアドバイスを含めてください。`,
          },
        ],
      }),
    { maxRetries: 3 }
  )

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  if (!text) throw new Error('サマリー生成に失敗しました')

  void trackCost({
    household_id: householdId,
    model: 'claude-sonnet-4-6',
    feature: 'monthly_summary',
    input_tokens: response.usage.input_tokens,
    output_tokens: response.usage.output_tokens,
  }, supabase)

  return text
}
