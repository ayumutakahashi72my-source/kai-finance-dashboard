import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-guard'
import { z } from 'zod'

const BudgetItemSchema = z.object({
  category_name: z.string().min(1),
  amount: z.number().int().positive(),
})

const PutSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  budgets: z.array(BudgetItemSchema).min(1).max(50),
})

// GET /api/budgets?month=YYYY-MM
export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response
  const { supabase, householdId } = auth

  const month = req.nextUrl.searchParams.get('month')
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'month パラメータが必要です (YYYY-MM)' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('budgets')
    .select('category_name, amount')
    .eq('household_id', householdId)
    .eq('month', `${month}-01`)
    .order('amount', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ budgets: data ?? [] })
}

// PUT /api/budgets — 月次予算を一括 upsert
export async function PUT(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response
  const { supabase, householdId } = auth

  const body = await req.json()
  const parsed = PutSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { month, budgets } = parsed.data
  const monthDate = `${month}-01`

  const rows = budgets.map((b) => ({
    household_id: householdId,
    month: monthDate,
    category_name: b.category_name,
    amount: b.amount,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('budgets')
    .upsert(rows, { onConflict: 'household_id,month,category_name' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ saved: rows.length })
}
