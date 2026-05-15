import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomBar } from '@/components/layout/BottomBar'
import { BudgetDashboard } from '@/components/budget/BudgetDashboard'

export default async function BudgetPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

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
            background: 'rgba(94,234,212,0.04)',
            filter: 'blur(120px)',
          }}
        />
      </div>

      <Sidebar />

      <div className="relative min-h-screen lg:pl-[220px]">
        <header
          className="flex items-center px-5 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
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
          <h1 className="hidden text-[15px] font-bold text-[#f0f0f5] lg:block">予算ダッシュボード</h1>
        </header>

        <main className="mx-auto max-w-2xl space-y-3 px-4 py-5 pb-32 lg:pb-10">
          <BudgetDashboard />
        </main>
      </div>

      <BottomBar />
    </div>
  )
}
