import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-guard'

export async function GET() {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response
  const { supabase, householdId } = auth

  const { data, error } = await supabase
    .from('categories')
    .select('id, name, color, icon, parent_id, created_at')
    .eq('household_id', householdId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: data ?? [] })
}
