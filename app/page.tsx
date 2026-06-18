import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileDropdown } from '@/components/layout/ProfileDropdown'
import { MonthSwitcher } from '@/components/dashboard/MonthSwitcher'
import { DashboardTabs } from '@/components/dashboard/DashboardTabs'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomBar } from '@/components/layout/BottomBar'
import { getTransactions } from '@/app/actions/transactions'
import { getHousehold } from '@/app/actions/households'
import { CreateHouseholdForm } from '@/components/households/CreateHouseholdForm'
import { KaiSystemBrand } from '@/components/kai/shared'
import { jstNow, jstMonthStr, jstDateStr, jstHour } from '@/lib/jst'
import type { Transaction } from '@/lib/types'

const CORAL = '#fb9477'

function currentMonthStr() {
  return jstMonthStr()
}

function calcStreak(transactions: Transaction[]): number {
  const dates = new Set(transactions.map((t) => t.occurred_on.slice(0, 10)))
  const today = jstNow()
  let streak = 0
  for (let i = 0; i < 60; i++) {
    const d = new Date(today.getTime())
    d.setUTCDate(d.getUTCDate() - i)
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
    if (dates.has(key)) streak++
    else if (i > 0) break
  }
  return streak
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const household = await getHousehold()
  if (!household) return <CreateHouseholdForm />

  const { month: rawMonth } = await searchParams
  const month = rawMonth ?? currentMonthStr()

  const displayName = user.user_metadata?.full_name ?? user.email ?? 'ユーザー'
  const firstName   = displayName.split(/[\s　]/)[0] ?? displayName
  const avatarUrl   = user.user_metadata?.avatar_url as string | undefined

  const [filteredTransactions, allTransactions] = await Promise.all([
    getTransactions(month) as Promise<Transaction[]>,
    getTransactions()      as Promise<Transaction[]>,
  ])

  const streak = calcStreak(allTransactions)

  const dateStr  = jstDateStr()
  const hour     = jstHour()
  const greeting = hour < 12 ? 'おはようございます' : hour < 18 ? 'こんにちは' : 'こんばんは'

  return (
    <div className="min-h-screen" style={{ background: '#0c0a14' }}>
      {/* Warm mesh background */}
      <div
        aria-hidden
        className="mesh-bg pointer-events-none fixed inset-0"
        style={{
          zIndex: 0,
          backgroundImage: `
            radial-gradient(ellipse 700px 500px at 80% 8%, rgba(251,148,119,.09), transparent 55%),
            radial-gradient(ellipse 600px 400px at 12% 78%, rgba(122,167,255,.06), transparent 55%),
            radial-gradient(ellipse 500px 350px at 50% 100%, rgba(167,139,250,.05), transparent 55%)
          `,
        }}
      />
      {/* Grid overlay */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          zIndex: 1,
          backgroundImage: `linear-gradient(rgba(255,255,255,.011) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.011) 1px,transparent 1px)`,
          backgroundSize: '36px 36px',
        }}
      />

      <Sidebar />

      <div className="relative min-h-screen lg:pl-[220px]" style={{ zIndex: 2 }}>
        {/* ── Mobile header ── */}
        <header
          className="flex items-center justify-between px-[18px] py-[14px] lg:hidden"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <KaiSystemBrand size="sm"/>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {streak > 0 && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'rgba(251,148,119,.12)', border: '1px solid rgba(251,148,119,.25)',
                borderRadius: 99, padding: '4px 9px', fontSize: 11, color: CORAL, fontWeight: 700,
              }}>
                <svg width="11" height="11" viewBox="0 0 12 14" fill="none" style={{ flexShrink: 0 }}><path d="M6 1C6 1 9.5 4.5 9.5 7.5C9.5 9.5 8 11 6 11C4 11 2.5 9.5 2.5 7.5C2.5 5.5 4 3.5 4 3.5C4 3.5 4.5 5 5.5 5C5.5 5 5.5 3 6 1Z" stroke={CORAL} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span style={{ fontFamily: 'var(--font-mono),monospace' }}>{streak}日</span>
              </span>
            )}
            <ProfileDropdown displayName={displayName} avatarUrl={avatarUrl} />
          </div>
        </header>

        {/* ── Desktop topbar ── */}
        <div
          className="hidden lg:flex items-center justify-between px-[30px] py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div>
            <p style={{ fontSize: 12, color: '#8b8ba0' }}>{greeting}、</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#f0f0f5', marginTop: 1 }}>
                {firstName}さん
              </p>
              <MonthSwitcher currentMonth={month} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {streak > 0 && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: 'rgba(251,148,119,.12)', border: '1px solid rgba(251,148,119,.28)',
                borderRadius: 99, padding: '5px 12px', fontSize: 12, color: CORAL, fontWeight: 700,
              }}>
                <svg width="12" height="12" viewBox="0 0 12 14" fill="none" style={{ flexShrink: 0 }}><path d="M6 1C6 1 9.5 4.5 9.5 7.5C9.5 9.5 8 11 6 11C4 11 2.5 9.5 2.5 7.5C2.5 5.5 4 3.5 4 3.5C4 3.5 4.5 5 5.5 5C5.5 5 5.5 3 6 1Z" stroke={CORAL} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span style={{ fontFamily: 'var(--font-mono),monospace' }}>{streak}日連続記録</span>
              </span>
            )}
            <ProfileDropdown displayName={displayName} avatarUrl={avatarUrl} />
          </div>
        </div>

        {/* ── Mobile greeting row ── */}
        <div
          className="flex items-baseline justify-between px-[18px] py-2 lg:hidden"
          style={{ fontSize: 12.5, color: '#c4c4d0' }}
        >
          <span>
            {greeting}、<span style={{ color: '#f0f0f5', fontWeight: 600 }}>{firstName}さん</span>
          </span>
          <span style={{ fontSize: 10, color: '#5e5e72', fontFamily: 'var(--font-mono),monospace', letterSpacing: '.1em' }}>
            {dateStr}
          </span>
        </div>

        {/* ── Dashboard content ── */}
        <main className="pb-32 lg:pb-10">
          <DashboardTabs
            transactions={filteredTransactions}
            allTransactions={allTransactions}
            month={month}
            streak={streak}
          />
        </main>
      </div>

      <BottomBar />
    </div>
  )
}
