import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-guard'

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const { supabase, householdId } = auth
  const { searchParams } = new URL(req.url)
  const monthParam = searchParams.get('month') // YYYY-MM

  const monthDate = monthParam ? `${monthParam}-01` : (() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  })()

  // UI側で spike/drop を分離してスライスするため、全件返して UI にソートを委ねる
  const { data, error } = await supabase
    .from('monthly_anomaly_flags')
    .select('category_name, actual_amount, expected_amount, deviation_rate, anomaly_type')
    .eq('household_id', householdId)
    .eq('month', monthDate)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ anomalies: data ?? [] })
}
