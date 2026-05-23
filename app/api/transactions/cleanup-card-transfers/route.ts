import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-guard'

// MF CSV の振替行が誤ってインポートされた際のクリーンアップ。
// 大項目「現金・カード」に分類された取引を削除する（CSV・自動取込どちらも対象）。
// 振替=1 / 計算対象=0 の行がバグにより支出として取り込まれていた問題への対処。

const TRANSFER_CATEGORY_NAMES = ['現金・カード', 'カード引き落とし']

export async function GET() {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response
  const { supabase, householdId } = auth

  const { data: cats } = await supabase
    .from('categories')
    .select('id, name')
    .eq('household_id', householdId)
    .in('name', TRANSFER_CATEGORY_NAMES)

  if (!cats?.length) {
    return NextResponse.json({ count: 0, categories: [] })
  }

  const catIds = cats.map((c) => c.id)
  const { count } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('household_id', householdId)
    .in('category_id', catIds)

  return NextResponse.json({ count: count ?? 0, categories: cats.map((c) => c.name) })
}

export async function DELETE() {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response
  const { supabase, householdId } = auth

  const { data: cats } = await supabase
    .from('categories')
    .select('id')
    .eq('household_id', householdId)
    .in('name', TRANSFER_CATEGORY_NAMES)

  if (!cats?.length) {
    return NextResponse.json({ deleted: 0 })
  }

  const catIds = cats.map((c) => c.id)

  const { data: deleted, error } = await supabase
    .from('transactions')
    .delete()
    .eq('household_id', householdId)
    .in('category_id', catIds)
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ deleted: deleted?.length ?? 0 })
}
