import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-guard'
import { scanAndAutoExclude } from '@/lib/duplicate-analyzer'
import { applyAccountExclusions } from '@/lib/account-settings'

/**
 * POST /api/transactions/duplicates/auto-resolve
 *
 * 学習済みパターンに基づいて重複取引を自動除外する。
 * - 既に除外された取引からパターンを学習
 * - 学習済みパターンにマッチする未除外取引を自動除外
 */
export async function POST() {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const { supabase, householdId } = auth

  // 1. 重複パターンの学習 + 自動除外
  const result = await scanAndAutoExclude(householdId, supabase)

  // 2. 口座単位の集計除外宣言を反映（新規取込分にも再適用）
  const account = await applyAccountExclusions(householdId, supabase)

  return NextResponse.json({
    ...result,
    accountExcluded: account.excluded,
    accountRestored: account.restored,
  })
}
