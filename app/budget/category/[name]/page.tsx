import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTransactions } from '@/app/actions/transactions'
import { getCategories } from '@/app/actions/categories'
import { CategoryTransactionsPage } from '@/components/budget/CategoryTransactionsPage'
import { jstMonthStr } from '@/lib/jst'
import type { Transaction, Category } from '@/lib/types'

export default async function BudgetCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>
  searchParams: Promise<{ month?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { name } = await params
  const { month: rawMonth } = await searchParams
  const catName = decodeURIComponent(name)
  const month = rawMonth ?? jstMonthStr()

  const [transactions, categories] = await Promise.all([
    getTransactions(month) as Promise<Transaction[]>,
    getCategories() as Promise<Category[]>,
  ])

  const catColor = categories.find((c) => c.name === catName)?.color ?? '#fb9477'

  return (
    <CategoryTransactionsPage
      catName={catName}
      color={catColor}
      month={month}
      initialTxs={transactions}
      categories={categories}
    />
  )
}
