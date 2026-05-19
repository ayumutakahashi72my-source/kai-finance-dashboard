import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-guard'
import { z } from 'zod'

const CreateSchema = z.object({
  name:          z.string().min(1).max(50),
  target_amount: z.number().int().positive(),
  deadline:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { data, error } = await supabase
    .from('financial_goals')
    .insert({ ...parsed.data, household_id: householdId })
    .select('id, name, target_amount, deadline, monthly_savings_target, monthly_spending_limit, risk_level, advice, created_at, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ goal: data }, { status: 201 })
}
