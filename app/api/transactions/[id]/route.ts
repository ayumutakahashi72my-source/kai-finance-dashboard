import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-guard'
import { todayJST, isValidCalendarDate } from '@/lib/jst'
import { recalculateScore } from '@/lib/score-calculator'
import { normalizeKeyword, logCorrection, upsertCategoryRag } from '@/lib/ai-classifier'
import { embedTextsWithCache } from '@/lib/embedder'
import { learnExcludePattern } from '@/lib/duplicate-analyzer'
import { z } from 'zod'

const UpdateSchema = z.object({
  amount: z.number().int().refine((n) => n !== 0).optional(),
  payee: z.string().min(1).max(100).optional(),
  occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(isValidCalendarDate, '存在しない日付です').optional(),
  category_id: z.string().uuid().nullable().optional(),
  is_fixed: z.boolean().optional(),
  excluded: z.boolean().optional(),
  excluded_reason: z.enum(['account', 'duplicate', 'manual']).optional(),
})

// PATCH /api/transactions/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const { supabase, householdId, user } = auth

  const { id } = await params
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'リクエスト本文が不正です' }, { status: 400 }) }
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  // category_id が指定された場合は自世帯のカテゴリであることを検証
  if (parsed.data.category_id) {
    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('id', parsed.data.category_id)
      .eq('household_id', householdId)
      .maybeSingle()
    if (!cat) return NextResponse.json({ error: 'カテゴリが不正です' }, { status: 422 })
  }

  // カテゴリ変更時は修正前の値を取得
  const { data: existing } = parsed.data.category_id !== undefined
    ? await supabase
        .from('transactions')
        .select('category_id, payee')
        .eq('id', id)
        .eq('household_id', householdId)
        .single()
    : { data: null }

  // excluded が指定された場合のみ理由を整合させる（除外時は既定 'manual'、戻し時は null）。
  // excluded を伴わない excluded_reason 単独指定は無視し、reason↔state の不変条件を守る。
  const updatePayload: Record<string, unknown> = { ...parsed.data }
  if (parsed.data.excluded !== undefined) {
    updatePayload.excluded_reason = parsed.data.excluded
      ? (parsed.data.excluded_reason ?? 'manual')
      : null
  } else {
    delete updatePayload.excluded_reason
  }

  // 取引が自分の世帯に属するか確認してから更新
  const { data: updated, error } = await supabase
    .from('transactions')
    .update(updatePayload)
    .eq('id', id)
    .eq('household_id', householdId)
    .select('occurred_on, payee, category_id')
    .single()

  if (error || !updated) {
    return NextResponse.json({ error: error?.message ?? '取引が見つかりません' }, { status: 404 })
  }

  // カテゴリが手動変更された場合（失敗しても保存自体は成功扱い）
  if (parsed.data.category_id !== undefined && parsed.data.category_id !== null && updated.payee) {
    try {
      const payeeKey = normalizeKeyword(updated.payee)
      if (existing?.category_id && parsed.data.category_id !== existing.category_id) {
        await logCorrection(
          householdId,
          payeeKey,
          existing.category_id,
          parsed.data.category_id,
          user.id,
          supabase
        )
      }
      // RPC 経由で書き込む（同一カテゴリなら hit_count 加算・カテゴリ変更ならリセット）。
      // embedding も付与し、類似店舗名の vector 検索にも学習を波及させる。
      let embedding: number[] | null = null
      if (process.env.VOYAGE_API_KEY) {
        try {
          const [vec] = await embedTextsWithCache([payeeKey], supabase)
          embedding = vec?.length ? vec : null
        } catch { /* embedding 失敗は無視 */ }
      }
      await upsertCategoryRag(supabase, householdId, [{
        household_id: householdId,
        payee_key: payeeKey,
        category_id: parsed.data.category_id,
        confidence: 1.0,
        embedding,
        hit_count: 1,
        last_seen: todayJST(),
      }])
    } catch { /* ログ・RAG更新の失敗は保存に影響させない */ }
  }

  try {
    const month = updated.occurred_on.slice(0, 7)
    await recalculateScore(supabase, householdId, month)
  } catch { /* スコア再計算の失敗は保存に影響させない */ }

  // excluded=true に変更された場合、パターンを学習（完了を待つ）
  if (parsed.data.excluded === true) {
    try {
      await learnExcludePattern(householdId, id, supabase)
    } catch { /* 学習失敗は保存に影響させない */ }
  }

  return NextResponse.json({ success: true })
}

// DELETE /api/transactions/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const { supabase, householdId } = auth

  const { id } = await params

  // 月を控えてから削除（スコア再計算に使う）
  const { data: tx } = await supabase
    .from('transactions')
    .select('occurred_on')
    .eq('id', id)
    .eq('household_id', householdId)
    .single()

  if (!tx) return NextResponse.json({ error: '取引が見つかりません' }, { status: 404 })

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('household_id', householdId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const month = tx.occurred_on.slice(0, 7)
  await recalculateScore(supabase, householdId, month)

  return NextResponse.json({ success: true })
}
