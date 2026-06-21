import { normalizeKeyword } from '@/lib/ai-classifier'
import { canonicalizeMerchant } from '@/lib/merchant-canonical'
import { matchesFixedPayee, matchesFixedCategory } from '@/lib/fixed-expense-keywords'

interface TransactionRow {
  payee: string
  amount: number
  occurred_on: string
  categories: unknown
}

interface FixedCandidate {
  household_id: string
  payee: string
  avg_amount: number
  months_seen: number
  updated_at: string
}

export function detectFixedExpenses(
  candidates: TransactionRow[],
  householdId: string,
  minMonths = 3,
): FixedCandidate[] {
  const payeeStats = new Map<string, {
    amounts: number[]
    months: Set<string>
    originalPayees: Map<string, number>
  }>()

  for (const tx of candidates) {
    const catName = (tx.categories as { name: string } | null)?.name ?? ''
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

  return [...payeeStats.entries()]
    .filter(([, stat]) => stat.months.size >= minMonths)
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
}
