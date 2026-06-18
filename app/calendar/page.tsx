import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileDropdown } from '@/components/layout/ProfileDropdown'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomBar } from '@/components/layout/BottomBar'
import { MonthSwitcher } from '@/components/dashboard/MonthSwitcher'
import { KaiSystemBrand } from '@/components/kai/shared'
import { CalendarView } from '@/components/calendar/CalendarView'
import { getTransactions } from '@/app/actions/transactions'
import { getCategories } from '@/app/actions/categories'
import { getHousehold } from '@/app/actions/households'
import { jstMonthStr } from '@/lib/jst'
import type { Transaction, Category } from '@/lib/types'

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
  const month = rawMonth ?? jstMonthStr()
  const [y, m] = month.split('-')

  const displayName = user.user_metadata?.full_name ?? user.email ?? 'ユーザー'
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined

  const [transactions, categories] = await Promise.all([
    getTransactions(month) as Promise<Transaction[]>,
    getCategories() as Promise<Category[]>,
  ])

  const totalIncome  = transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)

  return (
    <div className="min-h-screen" style={{ background: '#0c0a14' }}>
      {/* Mesh background */}
      <div aria-hidden className="mesh-bg pointer-events-none fixed inset-0" style={{ zIndex: 0, backgroundImage: `radial-gradient(ellipse 700px 500px at 80% 8%, rgba(251,148,119,.09), transparent 55%),radial-gradient(ellipse 600px 400px at 12% 78%, rgba(122,167,255,.06), transparent 55%)` }} />
      <div aria-hidden className="pointer-events-none fixed inset-0" style={{ zIndex: 1, backgroundImage: `linear-gradient(rgba(255,255,255,.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.012) 1px,transparent 1px)`, backgroundSize: '40px 40px' }} />

      <Sidebar />

      <div className="relative min-h-screen lg:pl-[220px]" style={{ zIndex: 2 }}>
        <header
          className="sticky top-0 z-30 flex items-center justify-between px-6 py-[14px]"
          style={{ background: 'rgba(8,8,14,.55)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.10)' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="lg:hidden">
              <KaiSystemBrand size="sm"/>
            </div>
            <h1 className="hidden text-[17px] font-bold lg:block" style={{ color: '#f0f0f5' }}>カレンダー</h1>
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

        <main className="mx-auto max-w-4xl px-4 py-5 pb-32 lg:pb-10">
          {/* Month header */}
          <div className="reveal-up mb-4">
            {/* Desktop: side-by-side */}
            <div className="hidden items-center justify-between lg:flex">
              <div>
                <p className="lbl">カレンダー</p>
                <p className="mt-1" style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.02em', color: '#f0f0f5' }}>
                  <span className="mono">{y}</span>
                  <span style={{ color: '#8b8ba0', fontSize: 16, margin: '0 6px' }}>·</span>
                  <span>{parseInt(m)}月</span>
                </p>
              </div>
              <div className="flex gap-2">
                {[
                  { label: '収入', value: `+¥${totalIncome.toLocaleString()}`, color: '#4ade80' },
                  { label: '支出', value: `-¥${totalExpense.toLocaleString()}`, color: '#fb7185' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-[14px] px-3.5 py-3" style={{ background: 'rgba(20,22,32,0.66)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.10)' }}>
                    <p className="lbl mb-1">{label}</p>
                    <p className="mono text-[14px] font-bold" style={{ color }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Mobile: 2-column full-width cards */}
            <div className="grid grid-cols-2 gap-2 lg:hidden">
              {[
                { label: '収入', value: `+¥${totalIncome.toLocaleString()}`, color: '#4ade80', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.18)' },
                { label: '支出', value: `-¥${totalExpense.toLocaleString()}`, color: '#fb7185', bg: 'rgba(251,113,133,0.08)', border: 'rgba(251,113,133,0.18)' },
              ].map(({ label, value, color, bg, border }) => (
                <div key={label} className="rounded-[14px] px-4 py-3" style={{ background: bg, border: `1px solid ${border}` }}>
                  <p className="lbl mb-1" style={{ fontSize: 11 }}>{label}</p>
                  <p className="mono font-bold" style={{ color, fontSize: 15 }}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="reveal-up mb-3 flex flex-wrap items-center justify-end gap-x-3 gap-y-1.5 text-[11px]" style={{ animationDelay: '60ms' }}>
            {[
              { dot: 'rgba(251,148,119,.25)', label: '支出少' },
              { dot: 'rgba(251,148,119,.85)', label: '支出多' },
              { dot: '#4ade80', label: '収入あり' },
              { dot: '#fb9477', label: '支出あり' },
              { dot: '#a78bfa', label: '固定費' },
            ].map(({ dot, label }) => (
              <span key={label} className="flex items-center gap-1">
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, display: 'inline-block', flexShrink: 0 }} />
                <span style={{ color: '#8b8ba0', fontWeight: 600 }}>{label}</span>
              </span>
            ))}
            <span style={{ color: '#5e5e72', fontSize: 10 }}>（日付をタップで詳細）</span>
          </div>

          {/* Calendar grid */}
          <div className="reveal-up rounded-[18px] p-4" style={{ background: 'rgba(20,22,32,0.66)', backdropFilter: 'blur(24px) saturate(160%)', border: '1px solid rgba(255,255,255,0.10)', animationDelay: '100ms' }}>
            <CalendarView transactions={transactions} categories={categories} month={month} />
          </div>
        </main>
      </div>

      <BottomBar />
    </div>
  )
}
