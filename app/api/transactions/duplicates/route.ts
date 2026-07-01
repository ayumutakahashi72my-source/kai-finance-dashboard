import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-guard'
import { normalizePayee, fetchAllTransactionsWithCategory } from '@/lib/duplicate-analyzer'

export async function GET() {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const { supabase, householdId } = auth

  // 取引数が1000件（Supabaseのデフォルト上限）を超える世帯でも
  // 重複を漏れなく検出できるよう、ページネーション付きの取得を使う。
  const data = await fetchAllTransactionsWithCategory(householdId, supabase)
  if (!data.length) return NextResponse.json({ groups: [] })

  // 同日・同額・同payee（正規化）のグループを検出
  const seen = new Map<string, typeof data>()
  for (const tx of data) {
    const key = `${tx.occurred_on}__${tx.amount}__${normalizePayee(tx.payee)}`
    const existing = seen.get(key) ?? []
    existing.push(tx)
    seen.set(key, existing)
  }

  const groups = [...seen.values()].filter((g) => g.length >= 2)

  return NextResponse.json({ groups })
}
