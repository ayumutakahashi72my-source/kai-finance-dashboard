import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-guard'
import { listAccountSummaries, applyAccountExclusions } from '@/lib/account-settings'
import { z } from 'zod'

// GET /api/settings/accounts — 口座一覧 + 集計状態 + 除外候補
export async function GET() {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response
  const { supabase, householdId } = auth

  const accounts = await listAccountSummaries(householdId, supabase)
  return NextResponse.json({ accounts })
}

const PatchSchema = z.object({
  source_account: z.string().min(1).max(200),
  excluded: z.boolean(),
})

// PATCH /api/settings/accounts — 口座の集計対象/除外を切替し transactions.excluded へ同期
export async function PATCH(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response
  const { supabase, householdId } = auth

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: '不正なリクエストです' }, { status: 400 })
  }
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }
  const { source_account, excluded } = parsed.data

  // account_settings を upsert
  const { error: upsertErr } = await supabase
    .from('account_settings')
    .upsert(
      {
        household_id: householdId,
        source_account,
        excluded,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'household_id,source_account' },
    )
  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 })
  }

  // transactions.excluded へ同期
  const { excluded: nExcluded, restored } = await applyAccountExclusions(householdId, supabase)

  return NextResponse.json({
    source_account,
    excluded,
    affected: excluded ? nExcluded : restored,
  })
}
