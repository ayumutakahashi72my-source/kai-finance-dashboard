import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-guard'
import { classifyTransactions } from '@/lib/ai-classifier'

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const { supabase, householdId, user } = auth

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'リクエスト本文が不正です' }, { status: 400 })
  }

  const payee = (body as { payee?: string }).payee?.trim()
  if (!payee || payee.length < 1) {
    return NextResponse.json({ category_id: null, category_name: null, confidence: 0 })
  }

  const { categoryIdMap } = await classifyTransactions(
    [{ index: 0, payee, category_hint: '' }],
    householdId,
    supabase,
    user.id
  )

  const categoryId = categoryIdMap.get(0) ?? null
  if (!categoryId) {
    return NextResponse.json({ category_id: null, category_name: null, confidence: 0 })
  }

  const { data: cat } = await supabase
    .from('categories')
    .select('name')
    .eq('id', categoryId)
    .eq('household_id', householdId)
    .single()

  return NextResponse.json({
    category_id: categoryId,
    category_name: cat?.name ?? null,
    confidence: 1,
  })
}
