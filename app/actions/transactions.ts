'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const TransactionSchema = z.object({
  amount: z.coerce
    .number({ error: '金額を入力してください' })
    .positive('金額は0より大きい値を入力してください'),
  description: z
    .string()
    .min(1, '説明を入力してください')
    .max(100, '説明は100文字以内で入力してください'),
  category: z.enum(['food', 'transport', 'entertainment', 'utility', 'health', 'other'], {
    error: 'カテゴリを選択してください',
  }),
  type: z.enum(['expense', 'income'], {
    error: '種別を選択してください',
  }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日付の形式が正しくありません'),
})

export type TransactionFormState = {
  errors?: Partial<Record<keyof z.infer<typeof TransactionSchema>, string[]>>
  message?: string
  success?: boolean
}

export async function createTransaction(
  _prevState: TransactionFormState | Record<string, never>,
  formData: FormData
): Promise<TransactionFormState> {
  const raw = {
    amount: formData.get('amount'),
    description: formData.get('description'),
    category: formData.get('category'),
    type: formData.get('type'),
    date: formData.get('date'),
  }

  const parsed = TransactionSchema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { message: '認証が必要です' }

  const { error } = await supabase
    .from('transactions')
    .insert({ ...parsed.data, user_id: user.id })

  if (error) return { message: `保存に失敗しました: ${error.message}` }

  revalidatePath('/')
  return { success: true }
}

export async function getTransactions() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50)

  return data ?? []
}
