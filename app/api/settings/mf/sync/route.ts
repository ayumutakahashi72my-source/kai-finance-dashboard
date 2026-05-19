import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mfLogin, fetchMfTransactions, MfOtpRequiredError, type MfLoginStep } from '@/lib/moneyforward-client'
import { mfBrowserSubmitOtp, type MfBrowserLoginStep } from '@/lib/mf-browser'
import { buildSourceHash } from '@/lib/csv-parser'

export const maxDuration = 60

type SupabaseClient = Awaited<ReturnType<typeof createClient>>
type TraceStep = MfLoginStep | MfBrowserLoginStep

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
    steps_detail?: TraceStep[]
  }
) {
  await supabase.from('mf_sync_logs').insert({
    household_id: householdId,
    ...payload,
    steps_detail: payload.steps_detail ?? null,
  })
}

/**
 * HTTP CookieJar.serialize() の結果 { domain: "name=val; name2=val2" } を
 * Playwright storageState JSON に変換する
 */
function toPlaywrightStorage(cookieState: Record<string, string>): string {
  const cookies = []
  for (const [domain, cookieStr] of Object.entries(cookieState)) {
    for (const part of cookieStr.split(/;\s*/)) {
      const eqIdx = part.indexOf('=')
      if (eqIdx < 0) continue
      const name = part.slice(0, eqIdx).trim()
      const value = part.slice(eqIdx + 1).trim()
      if (!name) continue
      cookies.push({
        name, value,
        domain,
        path: '/',
        expires: -1,
        httpOnly: false,
        secure: true,
        sameSite: 'Lax' as const,
      })
    }
  }
  return JSON.stringify({ cookies, origins: [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { data: household } = await supabase
    .from('households')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1)
    .single()
  if (!household) return NextResponse.json({ error: '世帯が見つかりません' }, { status: 404 })

  const { data: mfSetting } = await supabase
    .from('user_settings')
    .select('ext_uid, ext_secret')
    .eq('user_id', user.id)
    .eq('ext_provider', 'mf')
    .maybeSingle()

  if (!mfSetting?.ext_uid || !mfSetting?.ext_secret) {
    return NextResponse.json({ error: 'MF設定が未登録です。設定画面でIDとパスワードを登録してください。' }, { status: 400 })
  }

  const body = await req.json().catch(() => ({})) as {
    year?: number
    month?: number
    otp_code?: string
    otp_url?: string
    otp_storage_state?: string  // Playwright storageState JSON（HTTP loginのcookieState変換済み）
    session_cookie?: string
  }
  const now = new Date()
  const year = body.year ?? now.getFullYear()
  const month = body.month ?? now.getMonth() + 1

  const trace: TraceStep[] = []
  let session: string

  if (body.session_cookie) {
    // ブラウザ手動貼り付けモード
    const raw = body.session_cookie.trim()
    session = raw.startsWith('_moneyforward_session=') ? raw : `_moneyforward_session=${raw}`
    trace.push({ step: 'browser_session', url: 'moneyforward.com', status: 0, note: 'ブラウザセッションCookie使用' })
  } else if (body.otp_code && body.otp_url && body.otp_storage_state) {
    // OTPコード → Playwright でブラウザ操作（HTTP OTP POST は行わない）
    const otpTrace: MfBrowserLoginStep[] = []
    try {
      session = await mfBrowserSubmitOtp(
        body.otp_code,
        body.otp_url,
        body.otp_storage_state,
        otpTrace,
      )
    } catch (err) {
      const error_msg = err instanceof Error ? err.message : '不明なエラー'
      await writeLog(supabase, household.id, {
        triggered_by: 'manual',
        status: 'error', step: 'otp_browser',
        year, month, error_msg, steps_detail: otpTrace,
      })
      return NextResponse.json({ error: `OTP認証失敗: ${error_msg}`, trace: otpTrace }, { status: 502 })
    }
  } else {
    // 通常ログイン（HTTP）
    const loginTrace: MfLoginStep[] = []
    try {
      session = await mfLogin(mfSetting.ext_uid, mfSetting.ext_secret, loginTrace)
      trace.push(...loginTrace)
    } catch (err) {
      trace.push(...(err as { trace?: MfLoginStep[] }).trace ?? [])
      if (err instanceof MfOtpRequiredError) {
        // HTTPログイン成功・OTP必要 → cookieStateをPlaywright形式に変換して返す
        const otp_storage_state = toPlaywrightStorage(err.cookieState)
        return NextResponse.json({
          needs_otp: true,
          otp_url: err.otpUrl,
          otp_storage_state,
          trace: loginTrace,
        })
      }
      const error_msg = err instanceof Error ? err.message : '不明なエラー'
      await writeLog(supabase, household.id, {
        triggered_by: 'manual',
        status: 'error', step: 'login',
        year, month, error_msg, steps_detail: loginTrace,
      })
      return NextResponse.json({ error: `MFログイン失敗: ${error_msg}`, trace: loginTrace }, { status: 502 })
    }
  }

  // Step 2: 取引データ取得
  const fetchTrace: MfLoginStep[] = []
  let txList: Awaited<ReturnType<typeof fetchMfTransactions>>
  try {
    txList = await fetchMfTransactions(session, year, month, fetchTrace)
  } catch (err) {
    const error_msg = err instanceof Error ? err.message : '不明なエラー'
    await writeLog(supabase, household.id, {
      triggered_by: 'manual',
      status: 'error', step: 'fetch_transactions',
      year, month, error_msg, steps_detail: [...trace, ...fetchTrace],
    })
    return NextResponse.json({ error: `MFデータ取得失敗: ${error_msg}`, trace: [...trace, ...fetchTrace] }, { status: 502 })
  }

  if (!txList.length) {
    await writeLog(supabase, household.id, {
      triggered_by: 'manual',
      status: 'success', step: 'completed',
      inserted: 0, skipped: 0, year, month, steps_detail: [...trace, ...fetchTrace],
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
      year, month, error_msg: dbError.message, steps_detail: [...trace, ...fetchTrace],
    })
    return NextResponse.json({ error: `DB保存失敗: ${dbError.message}` }, { status: 500 })
  }

  const insertedCount = inserted?.length ?? 0
  const skippedCount = records.length - insertedCount
  await writeLog(supabase, household.id, {
    triggered_by: 'manual',
    status: 'success', step: 'completed',
    inserted: insertedCount, skipped: skippedCount,
    year, month, steps_detail: [...trace, ...fetchTrace],
  })

  return NextResponse.json({ inserted: insertedCount, skipped: skippedCount, year, month })
}
