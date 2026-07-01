export type TransactionSource = 'csv' | 'manual' | 'auto'

export interface Category {
  id: string
  household_id: string
  name: string
  color: string | null
  icon: string | null
  is_fixed: boolean
  parent_id: string | null
  created_at: string
  children?: Category[]
}

export interface Transaction {
  id: string
  household_id: string
  amount: number      // 正=収入, 負=支出
  payee: string
  occurred_on: string // YYYY-MM-DD
  category_id: string | null
  is_fixed: boolean
  excluded: boolean
  source: TransactionSource | null
  source_hash: string | null
  source_account: string | null
  created_at: string
  categories?: {
    name: string
    color: string | null
    icon: string | null
    parent_id: string | null
    parent?: { name: string; color: string | null } | null
  } | null
}

export type TransactionType = 'expense' | 'income'

// 旧 static カテゴリ（手動登録フォームのデフォルト表示用）
export const DEFAULT_CATEGORY_COLORS: Record<string, string> = {
  食費: '#5eead4',
  交通費: '#22d3ee',
  日用品: '#a78bfa',
  光熱費: '#fbbf24',
  '医療・健康': '#4ade80',
  外食: '#f97316',
  娯楽: '#ec4899',
  収入: '#86efac',
  その他: '#8b8ba0',
}
