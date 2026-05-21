import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-guard'
import { headers } from 'next/headers'

export async function POST() {
  const auth = await requireAuth({ requireAdmin: true })
  if (!auth.ok) return auth.response

  const { supabase, householdId, user } = auth

  const { data, error } = await supabase
    .from('household_invites')
    .insert({ household_id: householdId, created_by: user.id })
    .select('token')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: '招待リンクの作成に失敗しました' }, { status: 500 })
  }

  const headersList = await headers()
  const host = headersList.get('host') ?? ''
  const proto = host.startsWith('localhost') ? 'http' : 'https'
  const url = `${proto}://${host}/invite/${data.token}`

  return NextResponse.json({ url, token: data.token })
}
