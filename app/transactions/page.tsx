import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomBar } from '@/components/layout/BottomBar'
import { ProfileDropdown } from '@/components/layout/ProfileDropdown'
import { KaiSystemBrand } from '@/components/kai/shared'
import { TransactionsView } from '@/components/transactions/TransactionsView'
import { getHousehold } from '@/app/actions/households'
import { jstMonthStr } from '@/lib/jst'
import { Skeleton } from '@/components/ui/Skeleton'

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; view?: string }>
}) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const household = await getHousehold()
  if (!household) redirect('/')

  const { month: rawMonth, view } = await searchParams
  const month = rawMonth ?? jstMonthStr()
  const initialView = view === 'calendar' ? 'calendar' : 'list'

  const displayName = user.user_metadata?.full_name ?? user.email ?? 'ユーザー'
  const avatarUrl   = user.user_metadata?.avatar_url as string | undefined

  return (
    <div className="min-h-screen" style={{ background: 'var(--kai-bg-card)' }}>
      <div aria-hidden className="pointer-events-none fixed inset-0" style={{ zIndex: 0, backgroundImage: `radial-gradient(ellipse 700px 500px at 80% 8%, rgba(94,234,212,.06), transparent 55%)` }} />
      <div aria-hidden className="pointer-events-none fixed inset-0" style={{ zIndex: 1, backgroundImage: `linear-gradient(var(--kai-grid-line) 1px,transparent 1px),linear-gradient(90deg,var(--kai-grid-line) 1px,transparent 1px)`, backgroundSize: '40px 40px' }} />

      <Sidebar />

      <div className="relative min-h-screen lg:pl-[220px]" style={{ zIndex: 2 }}>
        <header
          className="sticky top-0 z-30 flex items-center justify-between px-5 py-[13px] lg:px-7"
          style={{ background: 'var(--kai-header-bg)', backdropFilter: 'blur(24px)', borderBottom: `1px solid var(--kai-border2)` }}
        >
          <div className="lg:hidden"><KaiSystemBrand size="sm"/></div>
          <h1 className="hidden text-[17px] font-bold lg:block" style={{ color: 'var(--kai-text1)' }}>収支</h1>
          <ProfileDropdown displayName={displayName} avatarUrl={avatarUrl} />
        </header>

        <main className="mx-auto max-w-2xl px-4 py-4 pb-32 lg:pb-10">
          <Suspense fallback={
            <div className="space-y-3">
              <Skeleton variant="panel" className="h-10" />
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} variant="panel" className="h-14" />)}
            </div>
          }>
            <TransactionsView month={month} initialView={initialView as 'list' | 'calendar'} />
          </Suspense>
        </main>
      </div>

      <BottomBar />
    </div>
  )
}
