import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-guard'
import { normalizeKeyword } from '@/lib/ai-classifier'

// GET /api/feedback — 修正履歴一覧（RAG昇格ステータス付き）
export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const { supabase, householdId } = auth

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200)

  const { data: corrections, error } = await supabase
    .from('category_corrections')
    .select(`
      id,
      payee_key,
      old_category_id,
      new_category_id,
      rag_promoted,
      rag_promoted_at,
      corrected_at,
      new_cat:categories!category_corrections_new_category_id_fkey(name),
      old_cat:categories!category_corrections_old_category_id_fkey(name)
    `)
    .eq('household_id', householdId)
    .order('corrected_at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: countRows } = await supabase
    .from('category_corrections')
    .select('payee_key, new_category_id')
    .eq('household_id', householdId)

  const useCounts = new Map<string, number>()
  for (const r of countRows ?? []) {
    const key = `${r.payee_key}::${r.new_category_id}`
    useCounts.set(key, (useCounts.get(key) ?? 0) + 1)
  }

  const result = (corrections ?? []).map((c) => {
    const newCat = c.new_cat as unknown as { name: string } | null
    const oldCat = c.old_cat as unknown as { name: string } | null
    const useCount = useCounts.get(`${c.payee_key}::${c.new_category_id}`) ?? 1
    return {
      id: c.id,
      payee_key: c.payee_key,
      old_category: oldCat?.name ?? null,
      new_category: newCat?.name ?? null,
      rag_promoted: c.rag_promoted,
      rag_promoted_at: c.rag_promoted_at,
      corrected_at: c.corrected_at,
      use_count: useCount,
      promotion_eligible: useCount >= 3,
    }
  })

  return NextResponse.json({ data: result, total: result.length })
}

// POST /api/feedback — 明示的フィードバック
export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const { supabase, user, householdId } = auth

  let body: { payee?: string; old_category_id?: string; new_category_id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '不正なリクエストです' }, { status: 400 })
  }

  if (!body.payee || !body.new_category_id) {
    return NextResponse.json({ error: 'payee と new_category_id は必須です' }, { status: 400 })
  }

  const payeeKey = normalizeKeyword(body.payee)

  const { error } = await supabase
    .from('category_corrections')
    .insert({
      household_id: householdId,
      payee_key: payeeKey,
      old_category_id: body.old_category_id ?? null,
      new_category_id: body.new_category_id,
      corrected_by: user.id,
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, payee_key: payeeKey })
}
