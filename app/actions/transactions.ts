'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkAndSendBudgetAlerts } from '@/lib/budget-alerts'
import { normalizeKeyword, upsertCategoryRag } from '@/lib/ai-classifier'
import { embedTextsWithCache } from '@/lib/embedder'
import { todayJST, isValidCalendarDate } from '@/lib/jst'

const TransactionSchema = z.object({
  amount: z.coerce
    .number({ error: '金額を入力してください' })
    .int('金額は整数で入力してください')
    .refine((n) => n !== 0, '金額は0以外の値を入力してください')
    // DBのint4上限(約21.4億)より手前で明示的に弾く
    .refine((n) => Math.abs(n) <= 999_999_999, '金額は9億9,999万円以内で入力してください'),
  payee: z
    .string()
    .trim()
    .min(1, '支払先を入力してください')
    .max(100, '支払先は100文字以内で入力してください'),
  occurred_on: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日付の形式が正しくありません')
    .refine(isValidCalendarDate, '存在しない日付です'),
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

  // category_id が指定された場合は自世帯のカテゴリであることを検証
  if (parsed.data.category_id) {
    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('id', parsed.data.category_id)
      .eq('household_id', householdId)
      .maybeSingle()
    if (!cat) return { errors: { category_id: ['カテゴリが不正です'] } }
  }

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

  // ユーザーがカテゴリを確定した取引は RAG に学習させる（支出のみ・失敗しても保存は成功扱い）。
  // 次回以降は exact cache で即ヒットし、LLM 呼び出しを削減できる。
  if (parsed.data.amount < 0 && parsed.data.category_id) {
    try {
      const payeeKey = normalizeKeyword(parsed.data.payee)
      if (payeeKey) {
        let embedding: number[] | null = null
        if (process.env.VOYAGE_API_KEY) {
          try {
            const [vec] = await embedTextsWithCache([payeeKey], supabase)
            embedding = vec?.length ? vec : null
          } catch { /* embedding 失敗は無視（exact cache だけでも学習効果あり） */ }
        }
        await upsertCategoryRag(supabase, householdId, [{
          household_id: householdId,
          payee_key: payeeKey,
          category_id: parsed.data.category_id,
          confidence: 1.0,
          embedding,
          hit_count: 1,
          last_seen: todayJST(),
        }])
      }
    } catch (e) {
      console.warn('[createTransaction] RAG learn failed:', e)
    }
  }

  // 予算超過アラート（支出のみ・失敗しても取引作成自体は成功扱い）
  if (parsed.data.amount < 0 && parsed.data.category_id) {
    checkAndSendBudgetAlerts(supabase, householdId, [parsed.data.category_id]).catch((e) =>
      console.warn('[budget-alert] check failed:', e)
    )
  }

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
      .eq('excluded', false)
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
      .eq('excluded', false)
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
