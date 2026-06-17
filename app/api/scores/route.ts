import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-guard'

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const { supabase, householdId } = auth
  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') // YYYY-MM

  const monthDate = month ? `${month}-01` : (() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  })()

  const { data, error } = await supabase
    .from('monthly_scores')
    .select('month, score, score_grade, budget_score, saving_score, bonus_score, score_detail, is_finalized, calculated_at')
    .eq('household_id', householdId)
    .eq('month', monthDate)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ score: data ?? null })
}
