import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { classifyFreeForm } from '@/lib/ai-classifier'

const CHUNK = 200
const BAD_CATEGORY_NAMES = ['未分類', 'その他', '不明', 'unknown', 'other']

export async function POST() {
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

  // 「未分類」等の不正カテゴリIDを取得して、対象行の category_id を null にリセット
  const { data: badCats } = await supabase
    .from('categories')
    .select('id')
    .eq('household_id', membership.household_id)
    .in('name', BAD_CATEGORY_NAMES)
  if (badCats?.length) {
    const ids = badCats.map((c) => c.id)
    await supabase
      .from('transactions')
      .update({ category_id: null })
      .eq('household_id', membership.household_id)
      .in('category_id', ids)
    // RAGキャッシュも同時にクリア（そうしないと再分類してもすぐ戻る）
    await supabase
      .from('category_rag')
      .delete()
      .eq('household_id', membership.household_id)
      .in('category_id', ids)
  }

  // 全件取得（ページネーションで上限なし）
  const allRows: Array<{ id: string; payee: string }> = []
  let from = 0
  while (true) {
    const { data } = await supabase
      .from('transactions')
      .select('id, payee')
      .eq('household_id', membership.household_id)
      .is('category_id', null)
      .order('occurred_on', { ascending: false })
      .range(from, from + CHUNK - 1)
    if (!data?.length) break
    allRows.push(...data)
    if (data.length < CHUNK) break
    from += CHUNK
  }

  if (!allRows.length) {
    return NextResponse.json({ classified: 0, message: '未分類の取引はありません' })
  }

  // CHUNK 件ずつ AI 分類してその都度 DB 更新
  let classified = 0
  for (let offset = 0; offset < allRows.length; offset += CHUNK) {
    const chunk = allRows.slice(offset, offset + CHUNK)
    const items = chunk.map((r, i) => ({ index: i, payee: r.payee, category_hint: '' }))
    const aiMap = await classifyFreeForm(items, membership.household_id, supabase)

    for (const [i, catId] of aiMap) {
      const row = chunk[i]
      if (!row) continue
      const { error } = await supabase
        .from('transactions')
        .update({ category_id: catId })
        .eq('id', row.id)
      if (!error) classified++
    }
  }

  return NextResponse.json({ classified, total: allRows.length })
}
