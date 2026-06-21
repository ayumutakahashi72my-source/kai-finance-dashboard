import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-guard'
import { threeMonthsAgoDate } from '@/lib/fixed-expense-keywords'
import { detectFixedExpenses } from '@/lib/fixed-expense-detect'

export async function POST() {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response
  const { supabase, householdId } = auth

  const since = threeMonthsAgoDate()

  const { data: candidates, error } = await supabase
    .from('transactions')
    .select('payee, amount, occurred_on, categories(name)')
    .eq('household_id', householdId)
    .lt('amount', 0)
    .gte('occurred_on', since)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!candidates?.length) return NextResponse.json({ detected: 0 })

  const fixedCandidates = detectFixedExpenses(candidates, householdId)

  if (fixedCandidates.length) {
    const { error: upsertErr } = await supabase
      .from('fixed_expense_suggestions')
      .upsert(fixedCandidates, { onConflict: 'household_id,payee' })

    if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 })
  }

  return NextResponse.json({ detected: fixedCandidates.length })
}
