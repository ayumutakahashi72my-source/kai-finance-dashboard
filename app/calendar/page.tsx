import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomBar } from '@/components/layout/BottomBar'
import { MonthSwitcher } from '@/components/dashboard/MonthSwitcher'
import { CalendarView } from '@/components/calendar/CalendarView'
import { getTransactions } from '@/app/actions/transactions'
import { getCategories } from '@/app/actions/categories'
import { getHousehold } from '@/app/actions/households'
import type { Transaction, Category } from '@/lib/types'

function currentMonthStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(month: string) {
  const [y, m] = month.split('-')
  return `${y}年${parseInt(m)}月`
}

export default async function CalendarPage({
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

  const [transactions, categories] = await Promise.all([
    getTransactions(month) as Promise<Transaction[]>,
    getCategories() as Promise<Category[]>,
  ])

  const totalIncome = transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)

  return (
    <div className="min-h-screen" style={{ background: '#0a0a10' }}>
      <Sidebar />

      <div className="relative min-h-screen lg:pl-[220px]">
        <header
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <h1 className="text-sm font-bold" style={{ color: '#f0f0f5' }}>カレンダー</h1>
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

        <main className="mx-auto max-w-4xl px-4 py-5 pb-32 lg:pb-10">
          {/* Month summary */}
          <div
            className="mb-4 grid grid-cols-2 gap-3 rounded-[16px] p-4"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div>
              <p className="mb-0.5 text-xs" style={{ color: '#8b8ba0' }}>
                {monthLabel(month)} 収入
              </p>
              <p className="text-lg font-bold" style={{ color: '#4ade80' }}>
                +¥{totalIncome.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="mb-0.5 text-xs" style={{ color: '#8b8ba0' }}>
                {monthLabel(month)} 支出
              </p>
              <p className="text-lg font-bold" style={{ color: '#f87171' }}>
                -¥{totalExpense.toLocaleString()}
              </p>
            </div>
          </div>

          <CalendarView transactions={transactions} categories={categories} month={month} />
        </main>
      </div>

      <BottomBar />
    </div>
  )
}
