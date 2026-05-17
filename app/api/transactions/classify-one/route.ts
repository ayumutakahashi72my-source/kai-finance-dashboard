import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { classifyTransactions } from '@/lib/ai-classifier'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json() as { payee?: string }
  const payee = body.payee?.trim()
  if (!payee || payee.length < 1) {
    return NextResponse.json({ category_id: null, category_name: null, confidence: 0 })
  }

  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()
  if (!membership) return NextResponse.json({ error: '世帯が見つかりません' }, { status: 400 })

  const { categoryIdMap } = await classifyTransactions(
    [{ index: 0, payee, category_hint: '' }],
    membership.household_id,
    supabase
  )

  const categoryId = categoryIdMap.get(0) ?? null
  if (!categoryId) {
    return NextResponse.json({ category_id: null, category_name: null, confidence: 0 })
  }

  const { data: cat } = await supabase
    .from('categories')
    .select('name')
    .eq('id', categoryId)
    .single()

  return NextResponse.json({
    category_id: categoryId,
    category_name: cat?.name ?? null,
    confidence: 1,
  })
}
