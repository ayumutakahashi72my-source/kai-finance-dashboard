import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/transactions?month=2026-05
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()
  if (!membership) return NextResponse.json({ error: '世帯が見つかりません' }, { status: 400 })

  const month = req.nextUrl.searchParams.get('month')

  let query = supabase
    .from('transactions')
    .select('*, categories(name, color, icon)')
    .eq('household_id', membership.household_id)
    .order('occurred_on', { ascending: false })
    .order('created_at', { ascending: false })

  if (month) {
    query = query.gte('occurred_on', `${month}-01`).lte('occurred_on', `${month}-31`)
  } else {
    query = query.limit(100)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: data ?? [] })
}
