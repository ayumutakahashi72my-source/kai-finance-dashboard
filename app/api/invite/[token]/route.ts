import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ token: string }> }

// GET: 招待情報プレビュー（参加前ユーザーも呼べる）
export async function GET(_req: NextRequest, { params }: Params) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { token } = await params
  const { data, error } = await supabase.rpc('get_invite_info', { p_token: token })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data?.length) return NextResponse.json({ error: 'invalid_token' }, { status: 404 })

  return NextResponse.json(data[0])
}

// POST: 招待を受諾して世帯に参加
export async function POST(_req: NextRequest, { params }: Params) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { token } = await params
  const { data, error } = await supabase.rpc('accept_household_invite', { p_token: token })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const result = data as { ok?: boolean; error?: string; household_id?: string }
  if (result.error) {
    const status = result.error === 'expired' || result.error === 'already_used' ? 410 : 404
    const messages: Record<string, string> = {
      invalid_token: '招待リンクが無効です',
      expired: '招待リンクの有効期限が切れています',
      already_used: 'この招待リンクはすでに使用されています',
    }
    return NextResponse.json({ error: messages[result.error] ?? result.error }, { status })
  }

  return NextResponse.json({ ok: true })
}
