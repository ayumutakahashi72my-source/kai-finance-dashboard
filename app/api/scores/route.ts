import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getHouseholdId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', userId)
    .limit(1)
    .single()
  return data?.household_id ?? null
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const householdId = await getHouseholdId(supabase, user.id)
  if (!householdId) return NextResponse.json({ error: '世帯が見つかりません' }, { status: 400 })

  const monthParam = request.nextUrl.searchParams.get('month')
  const now = new Date()
  const monthStr = monthParam ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthDate = `${monthStr}-01`

  const { data } = await supabase
    .from('monthly_scores')
    .select('score, budget_score, saving_score, bonus_score, score_grade, month, is_finalized')
    .eq('household_id', householdId)
    .eq('month', monthDate)
    .maybeSingle()

  return NextResponse.json({ data })
}
