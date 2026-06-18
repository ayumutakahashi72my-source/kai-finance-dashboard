import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-guard'
import { jstNow } from '@/lib/jst'

export async function GET() {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const { supabase, householdId } = auth

  // 直近3ヶ月分に制限してメモリを抑える
  const now = jstNow()
  const threeMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3, 1))
  const fromDate = `${threeMonthsAgo.getUTCFullYear()}-${String(threeMonthsAgo.getUTCMonth() + 1).padStart(2, '0')}-01`

  const { data, error } = await supabase
    .from('transactions')
    .select('id, occurred_on, amount, payee, category_id, categories(name, color, icon)')
    .eq('household_id', householdId)
    .gte('occurred_on', fromDate)
    .order('occurred_on', { ascending: false })
    .order('amount')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data?.length) return NextResponse.json({ groups: [] })

  const seen = new Map<string, typeof data>()
  for (const tx of data) {
    const key = `${tx.occurred_on}__${tx.amount}`
    const existing = seen.get(key) ?? []
    existing.push(tx)
    seen.set(key, existing)
  }

  const groups = [...seen.values()].filter((g) => g.length >= 2)

  return NextResponse.json({ groups })
}
