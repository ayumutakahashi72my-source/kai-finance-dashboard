import { getEnvKey } from '@/lib/api-keys'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { retryWithBackoff } from './retry'
import { trackCost } from './cost-tracker'
import type { SupabaseClient } from '@supabase/supabase-js'

export const GoalAdviceSchema = z.object({
  monthly_savings_target:       z.number().int().nonnegative(),
  monthly_spending_limit:       z.number().int(),
  risk_level:                   z.enum(['safe', 'caution', 'danger']),
  advice:                       z.string().min(1).max(400),
  suggested_months_alternative: z.number().int().positive().nullable(),
  plan_steps:                   z.array(z.string().max(80)).min(3).max(5),
})

export type GoalAdvice = z.infer<typeof GoalAdviceSchema>

const TOOL_DEF: Anthropic.Tool = {
  name: 'set_goal_advice',
  description: '目標達成に向けた月次予算アドバイスを返す',
  input_schema: {
    type: 'object' as const,
    properties: {
      monthly_savings_target: {
        type: 'integer',
        description: '目標達成に必要な月次貯蓄額（円）',
      },
      monthly_spending_limit: {
        type: 'integer',
        description: '今月使える支出上限（円）。収入 - 必要貯蓄額。マイナスもあり得る',
      },
      risk_level: {
        type: 'string',
        enum: ['safe', 'caution', 'danger'],
        description: 'safe=余裕あり, caution=やや厳しい, danger=現状では達成困難',
      },
      advice: {
        type: 'string',
        description: '100〜200字の日本語アドバイス。現状のギャップ、改善すべきカテゴリ、具体的な行動提案を含む',
      },
      suggested_months_alternative: {
        type: 'integer',
        description: 'risk_level が danger の場合のみ、現実的に達成可能な代替期間（ヶ月）を提案。danger でなければ null',
      },
      plan_steps: {
        type: 'array',
        items: { type: 'string' },
        description: '目標達成のための 3〜5 ステップの具体的行動プラン（各 50 字以内の日本語）',
        minItems: 3,
        maxItems: 5,
      },
    },
    required: [
      'monthly_savings_target',
      'monthly_spending_limit',
      'risk_level',
      'advice',
      'suggested_months_alternative',
      'plan_steps',
    ],
  },
}

export async function calculateGoalBudget(
  params: {
    targetAmount: number
    deadline: string
    avgMonthlyIncome: number
    avgMonthlyExpense: number
    topCategories: { name: string; amount: number }[]
  },
  supabase: SupabaseClient,
  householdId: string
): Promise<GoalAdvice> {
  const { targetAmount, deadline, avgMonthlyIncome, avgMonthlyExpense, topCategories } = params

  const today = new Date()
  const deadlineDate = new Date(deadline)
  const monthsRemaining = Math.max(
    1,
    Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30.44))
  )

  const baseMonthlyRequired = Math.ceil(targetAmount / monthsRemaining)
  const baseSpendingLimit   = avgMonthlyIncome - baseMonthlyRequired
  const currentMonthlySavings = avgMonthlyIncome - avgMonthlyExpense
  const realisticMonths = currentMonthlySavings > 0
    ? Math.ceil(targetAmount / currentMonthlySavings)
    : null

  const catLines = topCategories
    .slice(0, 6)
    .map((c) => `  - ${c.name}: ¥${c.amount.toLocaleString('ja-JP')}`)
    .join('\n')

  const context = `
目標金額: ¥${targetAmount.toLocaleString('ja-JP')}
達成期限: ${deadline}（今から約 ${monthsRemaining} ヶ月後）

直近3ヶ月の平均家計：
  月収入: ¥${avgMonthlyIncome.toLocaleString('ja-JP')}
  月支出: ¥${avgMonthlyExpense.toLocaleString('ja-JP')}
  月貯蓄（現状）: ¥${(avgMonthlyIncome - avgMonthlyExpense).toLocaleString('ja-JP')}

支出カテゴリ内訳（月平均）:
${catLines || '  （データなし）'}

単純計算:
  必要月次貯蓄: ¥${baseMonthlyRequired.toLocaleString('ja-JP')}
  使用可能上限: ¥${baseSpendingLimit.toLocaleString('ja-JP')}
  現状の貯蓄ペースでの達成見込み: ${realisticMonths != null ? `約 ${realisticMonths} ヶ月後` : '収入が支出を超えていないため算出不可'}
`.trim()

  const client = new Anthropic({ apiKey: getEnvKey('ANTHROPIC_API_KEY') })

  const response = await retryWithBackoff(
    () =>
      client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 768,
        tools: [TOOL_DEF],
        tool_choice: { type: 'any' },
        messages: [
          {
            role: 'user',
            content: `以下の家計データをもとに、目標達成のための月次予算アドバイスを作成してください。
達成が困難（danger）な場合は、現実的な代替期間（ヶ月数）も suggested_months_alternative で提案してください。

${context}

set_goal_advice ツールで結果を返してください。`,
          },
        ],
      }),
    { maxRetries: 3 }
  )

  void trackCost(
    {
      household_id: householdId,
      model: 'claude-sonnet-4-6',
      feature: 'goal_budget',
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
    supabase
  )

  const toolUse = response.content.find((b) => b.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('AI からの応答が取得できませんでした')
  }

  return GoalAdviceSchema.parse(toolUse.input)
}
