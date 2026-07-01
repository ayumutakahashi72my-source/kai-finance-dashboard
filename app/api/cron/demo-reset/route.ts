/**
 * Vercel Cron: デモデータ日次リセット
 * Schedule: 毎日 03:00 JST (UTC 18:00) → vercel.json: "0 18 * * *"
 *
 * DEMO_USER_EMAIL 環境変数が未設定の場合はスキップ（本番誤実行防止）。
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireCronAuth } from '@/lib/api-guard'

export async function GET(req: NextRequest) {
  const denied = requireCronAuth(req)
  if (denied) return denied

  const demoEmail = process.env.DEMO_USER_EMAIL
  if (!demoEmail) {
    return NextResponse.json({ skipped: true, reason: 'DEMO_USER_EMAIL not set' })
  }

  // service_role で RLS をバイパスして DB 関数を呼ぶ
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabase.rpc('reset_demo_data', { p_demo_email: demoEmail })

  if (error) {
    console.error('[demo-reset] rpc error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, reset_at: new Date().toISOString() })
}
