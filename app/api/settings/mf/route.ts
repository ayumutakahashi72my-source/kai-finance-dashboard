import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: MF設定の取得（パスワードはマスク）
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { data } = await supabase
    .from('user_settings')
    .select('ext_uid')
    .eq('user_id', user.id)
    .eq('ext_provider', 'mf')
    .maybeSingle()

  return NextResponse.json({
    mf_email:   data?.ext_uid ?? null,
    mf_enabled: !!data?.ext_uid,
  })
}

// PUT: MF認証情報を保存（1ユーザー1件 upsert）
export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = (await req.json()) as { mf_email?: string; mf_password?: string }
  if (!body.mf_email || !body.mf_password) {
    return NextResponse.json({ error: 'メールアドレスとパスワードは必須です' }, { status: 400 })
  }

  const { error } = await supabase
    .from('user_settings')
    .upsert(
      {
        user_id:      user.id,
        ext_uid:      body.mf_email,
        ext_secret:   body.mf_password,
        ext_provider: 'mf',
        updated_at:   new Date().toISOString(),
      },
      { onConflict: 'user_id,ext_provider' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE: MF設定を削除
export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { error } = await supabase
    .from('user_settings')
    .delete()
    .eq('user_id', user.id)
    .eq('ext_provider', 'mf')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
