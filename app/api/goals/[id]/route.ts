import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-guard'
import { z } from 'zod'

const UpdateSchema = z.object({
  name:          z.string().min(1).max(50).optional(),
  target_amount: z.number().int().positive().optional(),
  deadline:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const { supabase, householdId } = auth
  const { id } = await params

  const body = await req.json()
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  // target_amount / deadline が変わったら AI 試算データは無効化（再試算が必要）
  const invalidatesAi =
    parsed.data.target_amount !== undefined || parsed.data.deadline !== undefined
  const aiReset = invalidatesAi
    ? {
        monthly_savings_target:       null,
        monthly_spending_limit:       null,
        risk_level:                   null,
        advice:                       null,
        suggested_months_alternative: null,
        plan_steps:                   null,
      }
    : {}

  const { data, error } = await supabase
    .from('financial_goals')
    .update({ ...parsed.data, ...aiReset, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('household_id', householdId)
    .eq('is_active', true)
    .select('id, name, target_amount, deadline, monthly_savings_target, monthly_spending_limit, risk_level, advice, suggested_months_alternative, plan_steps, updated_at')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? '目標が見つかりません' }, { status: 404 })
  }

  return NextResponse.json({ goal: data })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const { supabase, householdId } = auth
  const { id } = await params

  const { error } = await supabase
    .from('financial_goals')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('household_id', householdId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
