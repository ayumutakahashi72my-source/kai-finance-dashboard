import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const email    = process.env.DEMO_USER_EMAIL
  const password = process.env.DEMO_USER_PASSWORD

  if (!email || !password) {
    return NextResponse.json({ error: 'デモモードが設定されていません' }, { status: 503 })
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    console.error('[demo-login] signInWithPassword error:', error.message)
    return NextResponse.json({ error: 'デモログインに失敗しました' }, { status: 401 })
  }

  return NextResponse.json({ ok: true })
}
