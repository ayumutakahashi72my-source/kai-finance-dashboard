import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mfLogin, fetchMfTransactions, type MfLoginStep } from '@/lib/moneyforward-client'
import { buildSourceHash } from '@/lib/csv-parser'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

async function writeLog(
  supabase: SupabaseClient,
  householdId: string,
  payload: {
    triggered_by: 'manual' | 'cron'
    status: 'success' | 'error'
    step?: string
    inserted?: number
    skipped?: number
    year?: number
    month?: number
    error_msg?: string
    steps_detail?: MfLoginStep[]
  }
) {
  await supabase.from('mf_sync_logs').insert({
    household_id: householdId,
    ...payload,
    steps_detail: payload.steps_detail ?? null,
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { data: household } = await supabase
    .from('households')
    .select('id, settings')
    .eq('owner_id', user.id)
    .limit(1)
    .single()
  if (!household) return NextResponse.json({ error: '世帯が見つかりません' }, { status: 404 })

  const settings = household.settings as { mf_email?: string; mf_password?: string } | null
  if (!settings?.mf_email || !settings?.mf_password) {
    return NextResponse.json({ error: 'MF設定が未登録です' }, { status: 400 })
  }

  const body = await req.json().catch(() => ({})) as { year?: number; month?: number }
  const now = new Date()
  const year = body.year ?? now.getFullYear()
  const month = body.month ?? now.getMonth() + 1

  // Step 1: ログイン（trace に各ステップを蓄積）
  const trace: MfLoginStep[] = []
  let session: string
  try {
    session = await mfLogin(settings.mf_email, settings.mf_password, trace)
  } catch (err) {
    const error_msg = err instanceof Error ? err.message : '不明なエラー'
    await writeLog(supabase, household.id, {
      triggered_by: 'manual',
      status: 'error', step: 'login',
      year, month, error_msg, steps_detail: trace,
    })
    return NextResponse.json({ error: `MFログイン失敗: ${error_msg}`, trace }, { status: 502 })
  }

  // Step 2: 取引データ取得（同じ trace を引き継ぐ）
  let txList: Awaited<ReturnType<typeof fetchMfTransactions>>
  try {
    txList = await fetchMfTransactions(session, year, month, trace)
  } catch (err) {
    const error_msg = err instanceof Error ? err.message : '不明なエラー'
    await writeLog(supabase, household.id, {
      triggered_by: 'manual',
      status: 'error', step: 'fetch_transactions',
      year, month, error_msg, steps_detail: trace,
    })
    return NextResponse.json({ error: `MFデータ取得失敗: ${error_msg}` }, { status: 502 })
  }

  if (!txList.length) {
    await writeLog(supabase, household.id, {
      triggered_by: 'manual',
      status: 'success', step: 'completed',
      inserted: 0, skipped: 0, year, month, steps_detail: trace,
    })
    return NextResponse.json({ inserted: 0, skipped: 0, year, month })
  }

  // Step 3: DB 保存
  const records = txList.map((t) => ({
    household_id: household.id,
    occurred_on: t.occurred_on,
    payee: t.payee,
    amount: t.amount,
    source: 'auto' as const,
    source_hash: buildSourceHash(t.raw_id, t.occurred_on, t.amount, t.payee),
    is_fixed: false,
  }))

  const { data: inserted, error: dbError } = await supabase
    .from('transactions')
    .upsert(records, {
      onConflict: 'household_id,occurred_on,amount,payee,source_hash',
      ignoreDuplicates: true,
    })
    .select('id')

  if (dbError) {
    await writeLog(supabase, household.id, {
      triggered_by: 'manual',
      status: 'error', step: 'db_upsert',
      year, month, error_msg: dbError.message, steps_detail: trace,
    })
    return NextResponse.json({ error: `DB保存失敗: ${dbError.message}` }, { status: 500 })
  }

  const insertedCount = inserted?.length ?? 0
  const skippedCount = records.length - insertedCount
  await writeLog(supabase, household.id, {
    triggered_by: 'manual',
    status: 'success', step: 'completed',
    inserted: insertedCount, skipped: skippedCount,
    year, month, steps_detail: trace,
  })

  return NextResponse.json({ inserted: insertedCount, skipped: skippedCount, year, month })
}
