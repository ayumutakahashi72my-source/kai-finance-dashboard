export type TransactionCategory =
  | 'food'
  | 'transport'
  | 'entertainment'
  | 'utility'
  | 'health'
  | 'other'

export type TransactionType = 'expense' | 'income'

export interface Transaction {
  id: string
  user_id: string
  amount: number
  description: string
  category: TransactionCategory
  type: TransactionType
  date: string
  created_at: string
}

export const CATEGORY_LABELS: Record<TransactionCategory, string> = {
  food: '食費',
  transport: '交通費',
  entertainment: '娯楽',
  utility: '光熱費',
  health: '医療・健康',
  other: 'その他',
}

export const CATEGORY_COLORS: Record<TransactionCategory, string> = {
  food: '#5eead4',
  transport: '#22d3ee',
  entertainment: '#a78bfa',
  utility: '#fbbf24',
  health: '#4ade80',
  other: '#8b8ba0',
}
