import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-guard'
import { z } from 'zod'

export async function GET() {
  const auth = await requireAuth({ requireAdmin: true })
  if (!auth.ok) return auth.response

  const { supabase } = auth

  const { data, error } = await supabase.rpc('get_household_members_with_email')
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

const patchSchema = z.object({
  userId:  z.string().uuid(),
  isAdmin: z.boolean(),
})

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth({ requireAdmin: true })
  if (!auth.ok) return auth.response

  const { supabase, user, householdId } = auth

  const body = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: '入力が正しくありません' }, { status: 400 })
  }

  const { userId, isAdmin } = parsed.data

  // 自分自身の権限は変更不可（最低1人のadminを保証するため）
  if (userId === user.id) {
    return NextResponse.json({ error: '自分自身の管理者権限は変更できません' }, { status: 400 })
  }

  const { error } = await supabase
    .from('household_members')
    .update({ is_admin: isAdmin })
    .eq('user_id', userId)
    .eq('household_id', householdId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
