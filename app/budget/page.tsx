import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomBar } from '@/components/layout/BottomBar'
import { MonthSwitcher } from '@/components/dashboard/MonthSwitcher'
import { BudgetDashboard } from '@/components/budget/BudgetDashboard'
import { TransactionList } from '@/components/transactions/TransactionList'
import { getTransactions, getUncategorizedCount } from '@/app/actions/transactions'
import { getCategories } from '@/app/actions/categories'
import { getHousehold } from '@/app/actions/households'
import type { Transaction, Category } from '@/lib/types'

function currentMonthStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const household = await getHousehold()
  if (!household) redirect('/')

  const { month: rawMonth } = await searchParams
  const month = rawMonth ?? currentMonthStr()

  const displayName = user.user_metadata?.full_name ?? user.email ?? 'ユーザー'
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined

  const [transactions, categories, uncategorizedCount] = await Promise.all([
    getTransactions(month) as Promise<Transaction[]>,
    getCategories() as Promise<Category[]>,
    getUncategorizedCount(),
  ])

  return (
    <div className="min-h-screen" style={{ background: '#0a0a10' }}>
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ top: -160, width: 600, height: 600, borderRadius: '50%', background: 'rgba(94,234,212,0.04)', filter: 'blur(120px)' }}
        />
      </div>

      <Sidebar />

      <div className="relative min-h-screen lg:pl-[220px]">
        <header
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2.5 lg:hidden">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-[9px]"
                style={{ background: 'linear-gradient(135deg,#5eead4,#22d3ee)', boxShadow: '0 0 14px rgba(94,234,212,0.28)' }}
              >
                <span className="mono text-[13px] font-black text-[#0a0a10]">K</span>
              </div>
              <span className="mono text-[13px] font-bold tracking-[0.04em] text-[#f0f0f5]">KAKEIBO AI</span>
            </div>
            <h1 className="hidden text-[15px] font-bold text-[#f0f0f5] lg:block">予算ダッシュボード</h1>
          </div>

          <div className="flex items-center gap-3">
            <MonthSwitcher currentMonth={month} />
            <Link href="/settings" className="shrink-0">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={displayName} width={32} height={32} className="h-8 w-8 rounded-full ring-2 ring-[#5eead4]/30 transition-opacity hover:opacity-80" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-opacity hover:opacity-80" style={{ background: 'rgba(94,234,212,0.15)', color: '#5eead4' }}>
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-2xl space-y-3 px-4 py-5 pb-32 lg:pb-10">
          <BudgetDashboard />
          <div className="reveal-up pt-1">
            <TransactionList initial={transactions} categories={categories} uncategorizedCount={uncategorizedCount} />
          </div>
        </main>
      </div>

      <BottomBar />
    </div>
  )
}
