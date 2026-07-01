import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-guard'
import { learnExcludePatterns } from '@/lib/duplicate-analyzer'
import { z } from 'zod'

const Schema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
  excluded: z.boolean(),
})

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const { supabase, householdId } = auth

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: '不正なリクエストです' }, { status: 400 })
  }
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { ids, excluded } = parsed.data

  // 重複チェッカー由来の除外は reason='duplicate'、戻し時は reason をクリア
  const { error } = await supabase
    .from('transactions')
    .update({ excluded, excluded_reason: excluded ? 'duplicate' : null })
    .eq('household_id', householdId)
    .in('id', ids)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 除外操作時にパターンを学習（バッチ・完了を待ってから応答）
  // await することで Vercel がレスポンス後に関数を終了しても学習が欠落しない
  if (excluded) {
    try {
      await learnExcludePatterns(householdId, ids, supabase)
    } catch (e) {
      // 学習失敗は除外操作自体の成否に影響させない
      console.error('[bulk-exclude] learn failed:', e)
    }
  }

  return NextResponse.json({ updated: ids.length })
}
