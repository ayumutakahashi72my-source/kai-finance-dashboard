import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-guard'

export async function GET() {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const { supabase, householdId } = auth

  const { data, error } = await supabase
    .from('transactions')
    .select('id, occurred_on, amount, payee, category_id, categories(name, color, icon)')
    .eq('household_id', householdId)
    .order('occurred_on', { ascending: false })
    .order('amount')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data?.length) return NextResponse.json({ groups: [] })

  // 同日・同金額のグループを検出
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
