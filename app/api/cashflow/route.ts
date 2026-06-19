import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-guard'
import { jstNow } from '@/lib/jst'

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response
  const { supabase, householdId } = auth

  const months = Math.min(12, Math.max(3, parseInt(req.nextUrl.searchParams.get('months') ?? '6', 10)))

  // Aggregate income/expense by month for the last N months
  const { data, error } = await supabase.rpc('cashflow_by_month', {
    p_household_id: householdId,
    p_months: months,
  })

  if (error) {
    // Fallback: JS-side aggregation if RPC not available
    const cutoff = jstNow()
    cutoff.setUTCMonth(cutoff.getUTCMonth() - months)
    const cutoffStr = cutoff.toISOString().slice(0, 10)

    const { data: rows, error: txErr } = await supabase
      .from('transactions')
      .select('occurred_on, amount')
      .eq('household_id', householdId)
      .gte('occurred_on', cutoffStr)

    if (txErr) return NextResponse.json({ error: txErr.message }, { status: 500 })

    const byMonth: Record<string, { income: number; expense: number }> = {}
    for (const row of rows ?? []) {
      const m = (row.occurred_on as string).slice(0, 7)
      if (!byMonth[m]) byMonth[m] = { income: 0, expense: 0 }
      if (row.amount > 0) byMonth[m].income  += row.amount
      else                byMonth[m].expense += Math.abs(row.amount)
    }

    const result = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, { income, expense }]) => ({
        month,
        income,
        expense,
        savings: income - expense,
        savings_rate: income > 0 ? Math.round(((income - expense) / income) * 100) : null,
      }))

    return NextResponse.json({ data: result })
  }

  return NextResponse.json({ data })
}
