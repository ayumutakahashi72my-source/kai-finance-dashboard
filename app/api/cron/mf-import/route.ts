/**
 * Vercel Cron: MoneyForward Me 自動取り込み
 * Schedule: 毎日 AM 6:00 JST (UTC 21:00 前日) → vercel.json: "0 21 * * *"
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mfLogin, fetchMfTransactions } from '@/lib/moneyforward-client'
import { buildSourceHash } from '@/lib/csv-parser'
import { classifyTransactions } from '@/lib/ai-classifier'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const { data: households } = await supabase
    .from('households')
    .select('id, settings')
    .not('settings->mf_email', 'is', null)

  if (!households?.length) {
    return NextResponse.json({ message: 'MF設定済み世帯なし' })
  }

  const now = new Date()
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth() + 1

  const results: Array<{
    householdId: string
    status: 'success' | 'error'
    step?: string
    inserted: number
    error?: string
  }> = []

  for (const household of households) {
    const settings = household.settings as { mf_email?: string; mf_password?: string } | null
    if (!settings?.mf_email || !settings?.mf_password) continue

    // Step 1: ログイン（trace に各ステップを蓄積）
    const trace: { step: string; url: string; status: number; note: string }[] = []
    let session: string
    try {
      session = await mfLogin(settings.mf_email, settings.mf_password, trace)
    } catch (err) {
      const error_msg = err instanceof Error ? err.message : '不明なエラー'
      await supabase.from('mf_sync_logs').insert({
        household_id: household.id, triggered_by: 'cron',
        status: 'error', step: 'login', year, month, error_msg, steps_detail: trace,
      })
      results.push({ householdId: household.id, status: 'error', step: 'login', inserted: 0, error: error_msg })
      continue
    }

    // Step 2: 取引取得（同じ trace を引き継ぐ）
    let txList: Awaited<ReturnType<typeof fetchMfTransactions>>
    try {
      txList = await fetchMfTransactions(session, year, month, trace)
    } catch (err) {
      const error_msg = err instanceof Error ? err.message : '不明なエラー'
      await supabase.from('mf_sync_logs').insert({
        household_id: household.id, triggered_by: 'cron',
        status: 'error', step: 'fetch_transactions', year, month, error_msg, steps_detail: trace,
      })
      results.push({ householdId: household.id, status: 'error', step: 'fetch_transactions', inserted: 0, error: error_msg })
      continue
    }

    if (!txList.length) {
      await supabase.from('mf_sync_logs').insert({
        household_id: household.id, triggered_by: 'cron',
        status: 'success', step: 'completed', inserted: 0, skipped: 0, year, month, steps_detail: trace,
      })
      results.push({ householdId: household.id, status: 'success', inserted: 0 })
      continue
    }

    // Step 3: AI分類
    const { categoryIdMap } = await classifyTransactions(
      txList.map((t, i) => ({ index: i, payee: t.payee, category_hint: '' })),
      household.id,
      supabase
    )

    // Step 4: DB 保存
    const records = txList.map((t, i) => ({
      household_id: household.id,
      occurred_on: t.occurred_on,
      payee: t.payee,
      amount: t.amount,
      source: 'auto' as const,
      source_hash: buildSourceHash(t.raw_id, t.occurred_on, t.amount, t.payee),
      is_fixed: false,
      category_id: categoryIdMap.get(i) ?? null,
    }))

    const { data: inserted, error: dbError } = await supabase
      .from('transactions')
      .upsert(records, {
        onConflict: 'household_id,occurred_on,amount,payee,source_hash',
        ignoreDuplicates: true,
      })
      .select('id')

    if (dbError) {
      await supabase.from('mf_sync_logs').insert({
        household_id: household.id, triggered_by: 'cron',
        status: 'error', step: 'db_upsert', year, month, error_msg: dbError.message, steps_detail: trace,
      })
      results.push({ householdId: household.id, status: 'error', step: 'db_upsert', inserted: 0, error: dbError.message })
      continue
    }

    const insertedCount = inserted?.length ?? 0
    const skippedCount = records.length - insertedCount
    await supabase.from('mf_sync_logs').insert({
      household_id: household.id, triggered_by: 'cron',
      status: 'success', step: 'completed',
      inserted: insertedCount, skipped: skippedCount, year, month, steps_detail: trace,
    })
    results.push({ householdId: household.id, status: 'success', inserted: insertedCount })
  }

  return NextResponse.json({ results, year, month })
}
