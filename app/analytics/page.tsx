import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileDropdown } from '@/components/layout/ProfileDropdown'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomBar } from '@/components/layout/BottomBar'
import { KaiSystemBrand } from '@/components/kai/shared'
import { getTransactions } from '@/app/actions/transactions'
import { getHousehold } from '@/app/actions/households'
import { KAI } from '@/lib/kai-tokens'
import { jstMonthStr } from '@/lib/jst'
import type { Transaction } from '@/lib/types'
import { AnalyticsContent } from '@/components/analytics/AnalyticsContent'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const household = await getHousehold()
  if (!household) redirect('/')

  const month = jstMonthStr()
  const displayName = user.user_metadata?.full_name ?? user.email ?? 'ユーザー'
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined

  const allTransactions = await getTransactions() as Transaction[]

  return (
    <div className="min-h-screen" style={{ background: KAI.bg }}>
      <div aria-hidden className="mesh-bg pointer-events-none fixed inset-0" style={{ zIndex: 0, backgroundImage: `radial-gradient(ellipse 700px 500px at 80% 8%, rgba(122,167,255,.09), transparent 55%),radial-gradient(ellipse 500px 400px at 12% 78%, rgba(251,148,119,.06), transparent 55%)` }} />
      <div aria-hidden className="pointer-events-none fixed inset-0" style={{ zIndex: 1, backgroundImage: `linear-gradient(${KAI.gridLine} 1px,transparent 1px),linear-gradient(90deg,${KAI.gridLine} 1px,transparent 1px)`, backgroundSize: '40px 40px' }} />

      <Sidebar />

      <div className="relative min-h-screen lg:pl-[220px]" style={{ zIndex: 2 }}>
        <header
          className="sticky top-0 z-30 flex items-center justify-between px-6 py-[14px]"
          style={{ background: KAI.headerBg, backdropFilter: 'blur(24px)', borderBottom: `1px solid ${KAI.border2}` }}
        >
          <div className="flex items-center gap-3">
            <div className="lg:hidden">
              <KaiSystemBrand size="sm"/>
            </div>
            <h1 className="hidden text-[17px] font-bold lg:block" style={{ color: KAI.text1 }}>分析</h1>
          </div>
          <ProfileDropdown displayName={displayName} avatarUrl={avatarUrl} />
        </header>

        <main className="mx-auto max-w-2xl space-y-3 px-4 py-5 pb-32 lg:pb-10">
          <AnalyticsContent month={month} allTransactions={allTransactions} />
        </main>
      </div>

      <BottomBar />
    </div>
  )
}
