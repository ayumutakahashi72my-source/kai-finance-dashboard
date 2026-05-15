import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import { BudgetAdviceResponseSchema, type BudgetAdviceResponse } from './ai-schemas'
import { retryWithBackoff } from './retry'

interface CategoryTotal {
  name: string
  total: number
}

interface PayeeTotal {
  payee: string
  count: number
  total: number
}

interface CompressedContext {
  categoryTotals: CategoryTotal[]
  topPayees: PayeeTotal[]
  months: string[]
}

async function buildContext(
  supabase: SupabaseClient,
  householdId: string,
  year: number,
  month: number
): Promise<CompressedContext> {
  // 直近3ヶ月の範囲を計算
  const months: string[] = []
  for (let i = 2; i >= 0; i--) {
    const d = new Date(year, month - 1 - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const since = `${months[0]}-01`
  const until = `${year}-${String(month).padStart(2, '0')}-31`

  const { data: rows } = await supabase
    .from('transactions')
    .select('amount, payee, occurred_on, categories(name)')
    .eq('household_id', householdId)
    .gte('occurred_on', since)
    .lte('occurred_on', until)
    .lt('amount', 0)

  const catMap = new Map<string, number>()
  const payeeMap = new Map<string, { count: number; total: number }>()

  for (const r of rows ?? []) {
    const cat = r.categories as unknown as { name: string } | null
    const catName = cat?.name ?? 'その他'
    catMap.set(catName, (catMap.get(catName) ?? 0) + Math.abs(r.amount))

    const p = payeeMap.get(r.payee) ?? { count: 0, total: 0 }
    payeeMap.set(r.payee, { count: p.count + 1, total: p.total + Math.abs(r.amount) })
  }

  const categoryTotals = [...catMap.entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)

  const topPayees = [...payeeMap.entries()]
    .map(([payee, v]) => ({ payee, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  return { categoryTotals, topPayees, months }
}

function buildPrompt(ctx: CompressedContext): string {
  const catLines = ctx.categoryTotals
    .map((c) => `- ${c.name}: ¥${c.total.toLocaleString()}`)
    .join('\n')
  const payeeLines = ctx.topPayees
    .map((p, i) => `${i + 1}. ${p.payee}: ${p.count}回 / ¥${p.total.toLocaleString()}`)
    .join('\n')

  return `以下は日本の家庭の直近3ヶ月（${ctx.months.join('〜')}）の家計データです。

## カテゴリ別支出合計
${catLines}

## 利用頻度・金額 上位店舗 Top10
${payeeLines}

このデータを分析して、来月の予算提案と支出クセを以下のJSON形式のみで返してください（他のテキスト不要）:
{
  "budget_suggestions": [
    {"category_name": "食費", "suggested_amount": 40000, "reason": "直近3ヶ月平均より10%削減可能"},
    ...
  ],
  "spending_pattern": {
    "summary": "全体的な支出傾向の一文要約",
    "habits": ["習慣1", "習慣2", "習慣3"]
  }
}`
}

export async function generateBudgetAdvice(
  supabase: SupabaseClient,
  householdId: string,
  year: number,
  month: number
): Promise<BudgetAdviceResponse> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const ctx = await buildContext(supabase, householdId, year, month)

  const raw = await retryWithBackoff(
    () =>
      client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: buildPrompt(ctx) }],
      }),
    { maxRetries: 3 }
  )

  const text = raw.content[0].type === 'text' ? raw.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AIレスポンスにJSONが含まれていません')

  const parsed = BudgetAdviceResponseSchema.safeParse(JSON.parse(jsonMatch[0]))
  if (!parsed.success) throw new Error(`AIレスポンスの検証失敗: ${parsed.error.message}`)

  return parsed.data
}
