import { timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export type AuthOk = {
  ok: true
  user: { id: string; email?: string }
  householdId: string
  isAdmin: boolean
  supabase: SupabaseClient
}

export type AuthFail = {
  ok: false
  response: NextResponse
}

/**
 * API Routes 共通の認証 + 世帯解決ヘルパー。
 * 失敗時は NextResponse を返すので呼び出し側は `if (!auth.ok) return auth.response` で抜ける。
 *
 * 使い方:
 *   const auth = await requireAuth()
 *   if (!auth.ok) return auth.response
 *   const { supabase, user, householdId, isAdmin } = auth
 *
 * オプション:
 *   { requireAdmin: true } を渡すと管理者でない場合 403 を返す。
 */
/**
 * Vercel Cron ルート共通の認証ガード。
 * - CRON_SECRET 未設定時は 503（`Bearer undefined` での突破を防ぐ）
 * - 比較は timingSafeEqual（タイミング攻撃対策）
 *
 * 使い方:
 *   const denied = requireCronAuth(req)
 *   if (denied) return denied
 */
export function requireCronAuth(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET が設定されていません' }, { status: 503 })
  }
  const given = Buffer.from(req.headers.get('authorization') ?? '', 'utf8')
  const expected = Buffer.from(`Bearer ${secret}`, 'utf8')
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

export async function requireAuth(
  opts: { requireAdmin?: boolean } = {}
): Promise<AuthOk | AuthFail> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: '認証が必要です' }, { status: 401 }) }
  }

  const { data: member } = await supabase
    .from('household_members')
    .select('household_id, is_admin')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!member?.household_id) {
    return { ok: false, response: NextResponse.json({ error: '世帯が見つかりません' }, { status: 400 }) }
  }

  if (opts.requireAdmin && !member.is_admin) {
    return { ok: false, response: NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 }) }
  }

  return {
    ok: true,
    user: { id: user.id, email: user.email },
    householdId: member.household_id,
    isAdmin: !!member.is_admin,
    supabase,
  }
}
