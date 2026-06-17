import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase admin client — Cron routes 専用。
 * service_role_key により RLS をバイパスして全世帯データにアクセスできる。
 * フロント・通常 API Routes では絶対に使用しないこと。
 */
export function createAdminClient() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL または SUPABASE_SERVICE_ROLE_KEY が未設定')
  }

  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
