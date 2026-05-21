'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const HouseholdSchema = z.object({
  name: z
    .string()
    .min(1, '世帯名を入力してください')
    .max(50, '世帯名は50文字以内で入力してください'),
})

export type HouseholdFormState = {
  errors?: { name?: string[] }
  message?: string
  success?: boolean
}

export async function createHousehold(
  _prevState: HouseholdFormState,
  formData: FormData
): Promise<HouseholdFormState> {
  const parsed = HouseholdSchema.safeParse({ name: formData.get('name') })
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { message: '認証が必要です' }

  const { data: household, error: householdError } = await supabase
    .from('households')
    .insert({ name: parsed.data.name, owner_id: user.id })
    .select('id')
    .single()

  if (householdError || !household) {
    return { message: `世帯の作成に失敗しました: ${householdError?.message}` }
  }

  const { error: memberError } = await supabase
    .from('household_members')
    .insert({ household_id: household.id, user_id: user.id, role: 'owner' })

  if (memberError) {
    return { message: `メンバー登録に失敗しました: ${memberError.message}` }
  }

  const DEFAULT_CATEGORIES = [
    { name: '食費',       color: '#5eead4' },
    { name: '交通費',     color: '#22d3ee' },
    { name: '娯楽',       color: '#a78bfa' },
    { name: '光熱費',     color: '#fbbf24' },
    { name: '医療・健康', color: '#4ade80' },
    { name: '日用品',     color: '#f97316' },
    { name: 'その他',     color: '#8b8ba0' },
  ]
  const { data: insertedCats } = await supabase
    .from('categories')
    .insert(DEFAULT_CATEGORIES.map((c) => ({ ...c, household_id: household.id })))
    .select('id, name')

  // 過去の世帯で学習した分類知識をシード
  const { data: knowledge } = await supabase
    .from('user_category_knowledge')
    .select('payee_key, category_name, confidence, hit_count, embedding')
    .eq('user_id', user.id)

  if (knowledge?.length) {
    const nameToId = new Map(insertedCats?.map((c) => [c.name, c.id]) ?? [])

    // 既存カテゴリにない名前だけ追加作成（「その他」系は除外）
    const badNames = new Set(['未分類', 'その他', '不明', 'unknown', 'other'])
    const newNames = [...new Set(knowledge.map((k) => k.category_name))]
      .filter((n) => !nameToId.has(n) && !badNames.has(n))
    if (newNames.length) {
      const { data: created } = await supabase
        .from('categories')
        .insert(newNames.map((name) => ({ name, household_id: household.id })))
        .select('id, name')
      for (const c of created ?? []) nameToId.set(c.name, c.id)
    }

    // category_rag にシード
    const ragSeed = knowledge
      .flatMap((k) => {
        const catId = nameToId.get(k.category_name)
        if (!catId) return []
        return [{
          household_id: household.id,
          payee_key: k.payee_key,
          category_id: catId,
          confidence: k.confidence,
          hit_count: k.hit_count,
          embedding: k.embedding,
        }]
      })
    if (ragSeed.length) {
      await supabase
        .from('category_rag')
        .upsert(ragSeed, { onConflict: 'household_id,payee_key' })
    }
  }

  revalidatePath('/')
  return { success: true }
}

export async function getHousehold() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('household_members')
    .select('role, households(id, name, owner_id)')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  return data ?? null
}
