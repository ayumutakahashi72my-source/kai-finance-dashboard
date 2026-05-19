'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const CategorySchema = z.object({
  name: z.string().min(1, 'カテゴリ名を入力してください').max(30, '30文字以内で入力してください'),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, '色の形式が正しくありません')
    .nullable()
    .optional(),
  parent_id: z.string().uuid().nullable().optional(),
})

export type CategoryFormState = {
  errors?: { name?: string[] }
  message?: string
  success?: boolean
}

async function getMembership() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase: null, user: null, householdId: null }

  const { data } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  return { supabase, user, householdId: data?.household_id ?? null }
}

export async function getCategories() {
  const { supabase, householdId } = await getMembership()
  if (!supabase || !householdId) return []

  const { data } = await supabase
    .from('categories')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: true })

  return data ?? []
}

export async function createCategory(input: {
  name: string
  color: string | null
}): Promise<CategoryFormState> {
  const parsed = CategorySchema.safeParse(input)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const { supabase, householdId } = await getMembership()
  if (!supabase) return { message: '認証が必要です' }
  if (!householdId) return { message: '世帯が見つかりません' }

  const { error } = await supabase
    .from('categories')
    .insert({ name: parsed.data.name, color: parsed.data.color ?? null, household_id: householdId })

  if (error) return { message: `カテゴリの作成に失敗しました: ${error.message}` }

  revalidatePath('/categories')
  revalidatePath('/settings')
  return { success: true }
}

export async function updateCategory(
  id: string,
  input: { name: string; color: string | null }
): Promise<CategoryFormState> {
  const parsed = CategorySchema.safeParse(input)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const { supabase } = await getMembership()
  if (!supabase) return { message: '認証が必要です' }

  const { error } = await supabase
    .from('categories')
    .update({ name: parsed.data.name, color: parsed.data.color ?? null })
    .eq('id', id)

  if (error) return { message: `更新に失敗しました: ${error.message}` }

  revalidatePath('/categories')
  revalidatePath('/settings')
  return { success: true }
}

export async function deleteCategory(id: string): Promise<{ success: boolean; message?: string }> {
  const { supabase } = await getMembership()
  if (!supabase) return { success: false, message: '認証が必要です' }

  const { error } = await supabase.from('categories').delete().eq('id', id)

  if (error) return { success: false, message: `削除に失敗しました: ${error.message}` }

  revalidatePath('/categories')
  revalidatePath('/settings')
  return { success: true }
}

export async function createSubCategory(
  parentId: string,
  input: { name: string; color: string | null }
): Promise<CategoryFormState> {
  const parsed = CategorySchema.safeParse(input)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const { supabase, householdId } = await getMembership()
  if (!supabase) return { message: '認証が必要です' }
  if (!householdId) return { message: '世帯が見つかりません' }

  const { data: parent } = await supabase
    .from('categories')
    .select('id, parent_id')
    .eq('id', parentId)
    .eq('household_id', householdId)
    .single()

  if (!parent) return { message: '親カテゴリが見つかりません' }
  if (parent.parent_id !== null) return { message: 'サブカテゴリの下にはカテゴリを作れません' }

  const { error } = await supabase
    .from('categories')
    .insert({
      name: parsed.data.name,
      color: parsed.data.color ?? null,
      household_id: householdId,
      parent_id: parentId,
    })

  if (error) return { message: `作成に失敗しました: ${error.message}` }

  revalidatePath('/categories')
  revalidatePath('/settings')
  return { success: true }
}
