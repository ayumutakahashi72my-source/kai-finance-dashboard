import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomBar } from '@/components/layout/BottomBar'
import { ProfileDropdown } from '@/components/layout/ProfileDropdown'
import { KaiSystemBrand } from '@/components/kai/shared'
import { getHousehold } from '@/app/actions/households'
import { AiPageTabs } from '@/components/ai/AiPageTabs'

export default async function SummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const household = await getHousehold()
  if (!household) redirect('/')

  const displayName = user.user_metadata?.full_name ?? user.email ?? 'ユーザー'
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined

  const { tab: rawTab } = await searchParams
  const initialTab = rawTab === '1' ? 1 : 0

  return (
    <div className="min-h-screen" style={{ background: 'var(--kai-bg-card)' }}>
      <div
        aria-hidden
        className="mesh-bg pointer-events-none fixed inset-0"
        style={{
          zIndex: 0,
          backgroundImage: `
            radial-gradient(ellipse 700px 500px at 80% 8%, rgba(167,139,250,.09), transparent 55%),
            radial-gradient(ellipse 600px 400px at 12% 78%, rgba(251,148,119,.06), transparent 55%)
          `,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          zIndex: 1,
          backgroundImage: `linear-gradient(var(--kai-grid-line) 1px,transparent 1px),linear-gradient(90deg,var(--kai-grid-line) 1px,transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      <Sidebar />

      <div className="relative min-h-screen lg:pl-[220px]" style={{ zIndex: 2 }}>
        <header
          className="sticky top-0 z-30 flex items-center justify-between px-6 py-[14px]"
          style={{ background: 'var(--kai-header-bg)', backdropFilter: 'blur(24px)', borderBottom: `1px solid var(--kai-border2)` }}
        >
          <div className="flex items-center gap-3">
            <div className="lg:hidden">
              <KaiSystemBrand size="sm"/>
            </div>
            <div className="hidden items-center gap-2.5 lg:flex">
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,rgba(167,139,250,.25),rgba(251,148,119,.20))', border: '1px solid rgba(167,139,250,.30)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--kai-violet, #a78bfa)" strokeWidth="1.8">
                  <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/>
                </svg>
              </div>
              <h1 className="text-[17px] font-bold" style={{ color: 'var(--kai-text1)' }}>AI アシスタント</h1>
              <span style={{ fontSize: 9, fontFamily: 'var(--font-mono),monospace', fontWeight: 700, letterSpacing: '.10em', padding: '2px 6px', borderRadius: 99, background: 'rgba(167,139,250,.12)', border: '1px solid rgba(167,139,250,.28)', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                Sonnet
              </span>
            </div>
          </div>
          <ProfileDropdown displayName={displayName} avatarUrl={avatarUrl} />
        </header>

        <main className="mx-auto max-w-2xl px-4 py-5 pb-32 lg:pb-10">
          <AiPageTabs initialTab={initialTab} />
        </main>
      </div>

      <BottomBar />
    </div>
  )
}
