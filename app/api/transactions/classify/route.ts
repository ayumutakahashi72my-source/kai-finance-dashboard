import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-guard'
import { classifyFreeForm, BAD_CATEGORY_NAMES } from '@/lib/ai-classifier'

const CHUNK = 200
const MAX_TOTAL = 5000

export async function POST() {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response
  const { supabase, user, householdId } = auth

  // 「未分類」等の不正カテゴリIDを取得して、対象行の category_id を null にリセット
  const { data: badCats } = await supabase
    .from('categories')
    .select('id')
    .eq('household_id', householdId)
    .in('name', [...BAD_CATEGORY_NAMES])
  if (badCats?.length) {
    const ids = badCats.map((c) => c.id)
    await supabase
      .from('transactions')
      .update({ category_id: null })
      .eq('household_id', householdId)
      .in('category_id', ids)
    // RAGキャッシュも同時にクリア（そうしないと再分類してもすぐ戻る）
    await supabase
      .from('category_rag')
      .delete()
      .eq('household_id', householdId)
      .in('category_id', ids)
  }

  // 全件取得（ページネーションで上限なし）
  const allRows: Array<{ id: string; payee: string }> = []
  let from = 0
  while (true) {
    const { data } = await supabase
      .from('transactions')
      .select('id, payee')
      .eq('household_id', householdId)
      .eq('excluded', false)
      .is('category_id', null)
      .order('occurred_on', { ascending: false })
      .range(from, from + CHUNK - 1)
    if (!data?.length) break
    allRows.push(...data)
    if (data.length < CHUNK || allRows.length >= MAX_TOTAL) break
    from += CHUNK
  }

  if (!allRows.length) {
    return NextResponse.json({ classified: 0, message: '未分類の取引はありません' })
  }

  // CHUNK 件ずつ AI 分類してその都度 DB 更新（カテゴリIDごとにバッチ UPDATE）
  let classified = 0
  for (let offset = 0; offset < allRows.length; offset += CHUNK) {
    const chunk = allRows.slice(offset, offset + CHUNK)
    const items = chunk.map((r, i) => ({ index: i, payee: r.payee, category_hint: '' }))
    const aiMap = await classifyFreeForm(items, householdId, supabase, user.id)

    const catIdToTxIds = new Map<string, string[]>()
    for (const [i, catId] of aiMap) {
      const row = chunk[i]
      if (!row) continue
      const ids = catIdToTxIds.get(catId) ?? []
      ids.push(row.id)
      catIdToTxIds.set(catId, ids)
    }

    await Promise.all(
      [...catIdToTxIds.entries()].map(async ([catId, txIds]) => {
        const { error } = await supabase
          .from('transactions')
          .update({ category_id: catId })
          .in('id', txIds)
        if (!error) classified += txIds.length
      })
    )
  }

  return NextResponse.json({ classified, total: allRows.length })
}
