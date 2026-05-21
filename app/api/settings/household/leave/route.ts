import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function snapshotKnowledge(
  householdId: string,
  userIds: string[],
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<void> {
  const { data: ragRows } = await supabase
    .from('category_rag')
    .select('payee_key, confidence, hit_count, embedding, categories(name)')
    .eq('household_id', householdId)

  if (!ragRows?.length) return

  const entries = ragRows
    .filter((r) => (r.categories as unknown as { name: string } | null)?.name)
    .map((r) => ({
      payee_key: r.payee_key,
      category_name: (r.categories as unknown as { name: string }).name,
      confidence: r.confidence,
      hit_count: r.hit_count,
      embedding: r.embedding,
    }))

  if (!entries.length) return

  for (const uid of userIds) {
    const upserts = entries.map((e) => ({ ...e, user_id: uid }))
    const { error } = await supabase
      .from('user_category_knowledge')
      .upsert(upserts, { onConflict: 'user_id,payee_key' })
    if (error) console.error('[leave] user_category_knowledge snapshot failed:', error.message)
  }
}

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { data: member } = await supabase
    .from('household_members')
    .select('household_id, role')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!member) return NextResponse.json({ error: '世帯が見つかりません' }, { status: 400 })

  const { household_id, role } = member

  if (role === 'owner') {
    const { count } = await supabase
      .from('household_members')
      .select('id', { count: 'exact', head: true })
      .eq('household_id', household_id)
      .neq('user_id', user.id)

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: '他のメンバーがいる間はオーナーは退会できません。先にメンバーを削除してください。' },
        { status: 400 },
      )
    }

    // 解散前に学習データを保存
    await snapshotKnowledge(household_id, [user.id], supabase)

    const { error } = await supabase
      .from('households')
      .delete()
      .eq('id', household_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    // 退会前に学習データを保存
    await snapshotKnowledge(household_id, [user.id], supabase)

    const { error } = await supabase
      .from('household_members')
      .delete()
      .eq('user_id', user.id)
      .eq('household_id', household_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // MF連携認証情報を削除（退会・解散どちらも）
  await supabase
    .from('user_settings')
    .delete()
    .eq('user_id', user.id)

  return NextResponse.json({ ok: true })
}
