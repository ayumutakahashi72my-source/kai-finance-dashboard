import { NextResponse } from 'next/server'
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
