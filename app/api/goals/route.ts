import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-guard'
import { z } from 'zod'

const MAX_GOAL_YEARS = 50

/** YYYY-MM-DD の実在日付かつ 50 年以内 */
const DeadlineSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`)
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
  }, '存在しない日付です')
  .refine((s) => {
    const max = new Date()
    max.setUTCFullYear(max.getUTCFullYear() + MAX_GOAL_YEARS)
    return s <= max.toISOString().slice(0, 10)
  }, `期限は${MAX_GOAL_YEARS}年以内で設定してください`)

const CreateSchema = z.object({
  name:          z.string().min(1).max(50),
  target_amount: z.number().int().positive(),
  deadline:      DeadlineSchema,
})

export async function GET() {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const { supabase, householdId } = auth

  const { data, error } = await supabase
    .from('financial_goals')
    .select('id, name, target_amount, deadline, monthly_savings_target, monthly_spending_limit, risk_level, advice, created_at, updated_at')
    .eq('household_id', householdId)
    .eq('is_active', true)
    .order('deadline', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ goals: data ?? [] })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const { supabase, householdId } = auth

  const body = await req.json()
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? '入力内容が不正です', details: parsed.error.flatten() }, { status: 422 })
  }

  const { data, error } = await supabase
    .from('financial_goals')
    .insert({ ...parsed.data, household_id: householdId })
    .select('id, name, target_amount, deadline, monthly_savings_target, monthly_spending_limit, risk_level, advice, created_at, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ goal: data }, { status: 201 })
}
