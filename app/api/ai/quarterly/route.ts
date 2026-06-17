import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-guard'

export async function GET() {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const { supabase, householdId } = auth

  const { data, error } = await supabase
    .from('quarterly_insights')
    .select('year, quarter, content, model, created_at')
    .eq('household_id', householdId)
    .order('year', { ascending: false })
    .order('quarter', { ascending: false })
    .limit(4)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ insights: data ?? [] })
}
