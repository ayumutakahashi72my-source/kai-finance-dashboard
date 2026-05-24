import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileDropdown } from '@/components/layout/ProfileDropdown'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomBar } from '@/components/layout/BottomBar'
import { MonthSwitcher } from '@/components/dashboard/MonthSwitcher'
import { KaiSystemBrand } from '@/components/kai/shared'
import { BudgetDashboard } from '@/components/budget/BudgetDashboard'
import { CashflowCard } from '@/components/budget/CashflowCard'
import { SavingsRateTracker } from '@/components/budget/SavingsRateTracker'
import { FixedExpenseCard } from '@/components/budget/FixedExpenseCard'
import { getHousehold } from '@/app/actions/households'

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


  return (
    <div className="min-h-screen" style={{ background: '#0c0a14' }}>
      {/* Mesh background */}
      <div aria-hidden className="mesh-bg pointer-events-none fixed inset-0" style={{ zIndex: 0, backgroundImage: `radial-gradient(ellipse 700px 500px at 80% 8%, rgba(251,148,119,.09), transparent 55%),radial-gradient(ellipse 500px 400px at 12% 78%, rgba(122,167,255,.06), transparent 55%)` }} />
      <div aria-hidden className="pointer-events-none fixed inset-0" style={{ zIndex: 1, backgroundImage: `linear-gradient(rgba(255,255,255,.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.012) 1px,transparent 1px)`, backgroundSize: '40px 40px' }} />

      <Sidebar />

      <div className="relative min-h-screen lg:pl-[220px]" style={{ zIndex: 2 }}>
        <header
          className="sticky top-0 z-30 flex items-center justify-between px-6 py-[14px]"
          style={{ background: 'rgba(8,8,14,.55)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.10)' }}
        >
          <div className="flex items-center gap-3">
            {/* mobile logo */}
            <div className="lg:hidden">
              <KaiSystemBrand size="sm"/>
            </div>
            <div className="hidden lg:block">
              <h1 className="text-[17px] font-bold" style={{ color: '#f0f0f5' }}>予算管理</h1>
              <p style={{ fontSize: 11, color: '#5e5e72', marginTop: 1 }}>{month.replace('-', '年') + '月'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden lg:block"><MonthSwitcher currentMonth={month} /></div>
            <ProfileDropdown displayName={displayName} avatarUrl={avatarUrl} />
          </div>
        </header>

        {/* Mobile: MonthSwitcher below header */}
        <div
          className="lg:hidden sticky top-[57px] z-20 flex justify-center py-2"
          style={{ background: 'rgba(8,8,14,.72)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <MonthSwitcher currentMonth={month} />
        </div>

        <main className="mx-auto max-w-2xl space-y-3 px-4 py-5 pb-32 lg:pb-10">
          <CashflowCard month={month} />
          <SavingsRateTracker currentMonth={month} />
          <BudgetDashboard month={month} />
          <FixedExpenseCard />
        </main>
      </div>

      <BottomBar />
    </div>
  )
}
