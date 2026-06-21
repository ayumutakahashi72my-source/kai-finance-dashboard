import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-guard'
import { normalizeKeyword } from '@/lib/ai-classifier'
import { canonicalizeMerchant } from '@/lib/merchant-canonical'
import { matchesFixedPayee, matchesFixedCategory, threeMonthsAgoDate } from '@/lib/fixed-expense-keywords'

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

  const payeeStats = new Map<string, {
    amounts: number[]
    months: Set<string>
    originalPayees: Map<string, number>
  }>()

  for (const tx of candidates) {
    const catName = (tx.categories as unknown as { name: string } | null)?.name ?? ''
    if (!matchesFixedCategory(catName) && !matchesFixedPayee(tx.payee)) continue

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
        household_id: householdId,
        payee: topPayee,
        avg_amount: Math.round(stat.amounts.reduce((a, b) => a + b, 0) / stat.amounts.length),
        months_seen: stat.months.size,
        updated_at: new Date().toISOString(),
      }
    })

  if (fixedCandidates.length) {
    const { error: upsertErr } = await supabase
      .from('fixed_expense_suggestions')
      .upsert(fixedCandidates, { onConflict: 'household_id,payee' })

    if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 })
  }

  return NextResponse.json({ detected: fixedCandidates.length })
}
