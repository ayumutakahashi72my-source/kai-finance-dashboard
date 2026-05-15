import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LogoutButton } from '@/components/auth/LogoutButton'
import { TransactionList } from '@/components/transactions/TransactionList'
import { SummaryCards } from '@/components/dashboard/SummaryCards'
import { CategoryBreakdown } from '@/components/dashboard/CategoryBreakdown'
import { MonthlyChart } from '@/components/dashboard/MonthlyChart'
import { MonthSwitcher } from '@/components/dashboard/MonthSwitcher'
import { AiSummaryCard } from '@/components/dashboard/AiSummaryCard'
import { AiChatPanel } from '@/components/dashboard/AiChatPanel'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomBar } from '@/components/layout/BottomBar'
import { Ticker } from '@/components/layout/Ticker'
import { getTransactions, getUncategorizedCount } from '@/app/actions/transactions'
import { getCategories } from '@/app/actions/categories'
import { getHousehold } from '@/app/actions/households'
import { CreateHouseholdForm } from '@/components/households/CreateHouseholdForm'
import type { Transaction, Category } from '@/lib/types'

function currentMonthStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) redirect('/login')

  const household = await getHousehold()
  if (!household) return <CreateHouseholdForm />

  const { month: rawMonth } = await searchParams
  const month = rawMonth ?? currentMonthStr()

  const displayName = user.user_metadata?.full_name ?? user.email ?? 'ユーザー'
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined

  const [filteredTransactions, allTransactions, categories, uncategorizedCount] = await Promise.all([
    getTransactions(month) as Promise<Transaction[]>,
    getTransactions() as Promise<Transaction[]>,
    getCategories() as Promise<Category[]>,
    getUncategorizedCount(),
  ])

  return (
    <div className="min-h-screen" style={{ background: '#0a0a10' }}>
      {/* ambient glow */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: -160,
            width: 600,
            height: 600,
            borderRadius: '50%',
            background: 'rgba(94,234,212,0.05)',
            filter: 'blur(120px)',
          }}
        />
      </div>

      {/* Sidebar — PC */}
      <Sidebar />

      {/* Main content */}
      <div className="relative min-h-screen lg:pl-[220px]">
        {/* Top header */}
        <header
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-[9px]"
              style={{
                background: 'linear-gradient(135deg,#5eead4,#22d3ee)',
                boxShadow: '0 0 14px rgba(94,234,212,0.28)',
              }}
            >
              <span className="mono text-[13px] font-black text-[#0a0a10]">K</span>
            </div>
            <span className="mono text-[13px] font-bold tracking-[0.04em] text-[#f0f0f5]">KAKEIBO AI</span>
          </div>

          {/* PC: page title */}
          <div className="hidden items-center gap-3 lg:flex">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={displayName} width={32} height={32} className="h-8 w-8 rounded-full ring-2 ring-[#5eead4]/30" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5eead4]/20 text-sm font-bold text-[#5eead4]">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm font-medium text-[#f0f0f5]">{displayName}</span>
          </div>

          <div className="flex items-center gap-3">
            <MonthSwitcher currentMonth={month} />
            <Link href="/categories" className="hidden text-xs text-[#8b8ba0] transition-colors hover:text-[#f0f0f5] lg:block">
              カテゴリ
            </Link>
            <Link href="/settings" className="hidden text-xs text-[#8b8ba0] transition-colors hover:text-[#f0f0f5] lg:block">
              設定
            </Link>
            <LogoutButton />
          </div>
        </header>

        {/* Ticker */}
        <Ticker transactions={allTransactions} />

        {/* Dashboard content */}
        <main className="mx-auto max-w-2xl space-y-3 px-4 py-5 pb-32 lg:pb-10">
          {/* Hero balance card */}
          <SummaryCards transactions={filteredTransactions} allTransactions={allTransactions} />

          {/* Charts — 2 col */}
          <div
            className="reveal-up grid grid-cols-1 gap-3 sm:grid-cols-2"
            style={{ animationDelay: '80ms' }}
          >
            <CategoryBreakdown transactions={filteredTransactions} />
            <MonthlyChart transactions={allTransactions} />
          </div>

          {/* AI サマリー */}
          <AiSummaryCard />

          {/* AI チャット */}
          <div
            className="reveal-up"
            style={{ animationDelay: '200ms' }}
          >
            <AiChatPanel />
          </div>

          {/* 取引履歴 */}
          <div
            className="reveal-up"
            style={{ animationDelay: '260ms' }}
          >
            <TransactionList initial={filteredTransactions} categories={categories} uncategorizedCount={uncategorizedCount} />
          </div>
        </main>
      </div>

      {/* Bottom nav — mobile */}
      <BottomBar />
    </div>
  )
}
