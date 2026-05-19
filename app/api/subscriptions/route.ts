import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-guard'

export async function GET() {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const { supabase, householdId } = auth

  const { data, error } = await supabase
    .from('fixed_expense_suggestions')
    .select('id, payee, avg_amount, months_seen, dismissed, confirmed_at, detected_at, updated_at')
    .eq('household_id', householdId)
    .order('avg_amount', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ subscriptions: data ?? [] })
}
