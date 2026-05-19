'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const TransactionSchema = z.object({
  amount: z.coerce
    .number({ error: '金額を入力してください' })
    .int('金額は整数で入力してください')
    .refine((n) => n !== 0, '金額は0以外の値を入力してください'),
  payee: z
    .string()
    .min(1, '支払先を入力してください')
    .max(100, '支払先は100文字以内で入力してください'),
  occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日付の形式が正しくありません'),
  category_id: z.string().uuid().nullable().optional(),
  is_fixed: z.coerce.boolean().optional(),
})

export type TransactionFormState = {
  errors?: Partial<Record<keyof z.infer<typeof TransactionSchema>, string[]>>
  message?: string
  success?: boolean
}

async function getMembership() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase: null, householdId: null }

  const { data } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  return { supabase, householdId: data?.household_id ?? null }
}

export async function createTransaction(
  _prev: TransactionFormState | Record<string, never>,
  formData: FormData
): Promise<TransactionFormState> {
  const raw = {
    amount: formData.get('amount'),
    payee: formData.get('payee'),
    occurred_on: formData.get('occurred_on'),
    category_id: formData.get('category_id') || null,
    is_fixed: formData.get('is_fixed') ?? false,
  }

  const parsed = TransactionSchema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const { supabase, householdId } = await getMembership()
  if (!supabase) return { message: '認証が必要です' }
  if (!householdId) return { message: '世帯が見つかりません' }

  const { error } = await supabase.from('transactions').insert({
    household_id: householdId,
    amount: parsed.data.amount,
    payee: parsed.data.payee,
    occurred_on: parsed.data.occurred_on,
    category_id: parsed.data.category_id ?? null,
    is_fixed: parsed.data.is_fixed ?? false,
    source: 'manual',
  })

  if (error) return { message: `保存に失敗しました: ${error.message}` }

  revalidatePath('/')
  return { success: true }
}

const BAD_CATEGORY_NAMES = ['未分類', 'その他', '不明', 'unknown', 'other']

export async function getUncategorizedCount(): Promise<number> {
  const { supabase, householdId } = await getMembership()
  if (!supabase || !householdId) return 0

  const [{ count: nullCount }, { data: badCats }] = await Promise.all([
    supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('household_id', householdId)
      .is('category_id', null),
    supabase
      .from('categories')
      .select('id')
      .eq('household_id', householdId)
      .in('name', BAD_CATEGORY_NAMES),
  ])

  let badCount = 0
  if (badCats?.length) {
    const ids = badCats.map((c) => c.id)
    const { count } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('household_id', householdId)
      .in('category_id', ids)
    badCount = count ?? 0
  }

  return (nullCount ?? 0) + badCount
}

export async function getTransactions(month?: string) {
  const { supabase, householdId } = await getMembership()
  if (!supabase || !householdId) return []

  let query = supabase
    .from('transactions')
    .select('*, categories(name, color, icon)')
    .eq('household_id', householdId)
    .order('occurred_on', { ascending: false })
    .order('created_at', { ascending: false })

  if (month) {
    const [y, m] = month.split('-').map(Number)
    const nextMonth = m === 12
      ? `${y + 1}-01-01`
      : `${y}-${String(m + 1).padStart(2, '0')}-01`
    query = query.gte('occurred_on', `${month}-01`).lt('occurred_on', nextMonth)
  } else {
    // スパークライン（直近6ヶ月トレンド）用に全件取得。limit(100)だと古い月が切れる
    const d = new Date()
    d.setMonth(d.getMonth() - 6)
    const since = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
    query = query.gte('occurred_on', since)
  }

  const { data } = await query
  return data ?? []
}
