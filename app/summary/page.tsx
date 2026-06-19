import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomBar } from '@/components/layout/BottomBar'
import { ProfileDropdown } from '@/components/layout/ProfileDropdown'
import { KaiSystemBrand } from '@/components/kai/shared'
import { getHousehold } from '@/app/actions/households'
import { AiChatPanel } from '@/components/dashboard/AiChatPanel'
import { SummaryContent } from '@/components/dashboard/SummaryContent'

export default async function SummaryPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const household = await getHousehold()
  if (!household) redirect('/')

  const displayName = user.user_metadata?.full_name ?? user.email ?? 'ユーザー'
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined

  return (
    <div className="min-h-screen" style={{ background: 'var(--kai-bg-card)' }}>
      <div
        aria-hidden
        className="mesh-bg pointer-events-none fixed inset-0"
        style={{
          zIndex: 0,
          backgroundImage: `
            radial-gradient(ellipse 700px 500px at 80% 8%, rgba(251,148,119,.09), transparent 55%),
            radial-gradient(ellipse 600px 400px at 12% 78%, rgba(167,139,250,.06), transparent 55%)
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
        {/* header */}
        <header
          className="sticky top-0 z-30 flex items-center justify-between px-6 py-[14px]"
          style={{ background: 'var(--kai-header-bg)', backdropFilter: 'blur(24px)', borderBottom: `1px solid var(--kai-border2)` }}
        >
          <div className="flex items-center gap-3">
            {/* mobile logo */}
            <div className="lg:hidden">
              <KaiSystemBrand size="sm"/>
            </div>
            <div className="hidden items-center gap-2.5 lg:flex">
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,rgba(167,139,250,.25),rgba(251,148,119,.20))', border: '1px solid rgba(167,139,250,.30)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="6" r="3" fill="url(#hd-g)" />
                  <path d="M3 14c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="url(#hd-g)" strokeWidth="1.5" strokeLinecap="round" />
                  <defs><linearGradient id="hd-g" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#a78bfa"/><stop offset="1" stopColor="#fb9477"/></linearGradient></defs>
                </svg>
              </div>
              <h1 className="text-[17px] font-bold" style={{ color: 'var(--kai-text1)' }}>AIチャット</h1>
              <span style={{ fontSize: 9, fontFamily: 'var(--font-mono),monospace', fontWeight: 700, letterSpacing: '.10em', padding: '2px 6px', borderRadius: 99, background: 'rgba(167,139,250,.12)', border: '1px solid rgba(167,139,250,.28)', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#a78bfa', boxShadow: '0 0 6px rgba(167,139,250,.8)', animation: 'kai-blink 1.8s ease-in-out infinite', display: 'inline-block' }} />
                Sonnet
              </span>
            </div>
          </div>
          <ProfileDropdown displayName={displayName} avatarUrl={avatarUrl} />
        </header>

        <main className="mx-auto max-w-2xl px-4 py-5 pb-32 lg:pb-10 space-y-4">
          {/* Primary: full chat panel */}
          <AiChatPanel alwaysOpen />

          {/* Secondary: monthly summary (collapsible) */}
          <details
            className="rounded-[18px] overflow-hidden"
            style={{ background: 'var(--kai-bg-panel)', backdropFilter: 'blur(24px) saturate(160%)', border: `1px solid var(--kai-border2)` }}
          >
            <summary
              style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--kai-text3)', listStyle: 'none', userSelect: 'none' }}
            >
              <span style={{ width: 20, height: 20, borderRadius: 5, background: 'linear-gradient(135deg,#a78bfa,#fb9477)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: 'var(--kai-bg)', flexShrink: 0 }}>AI</span>
              月次サマリー
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft: 'auto', flexShrink: 0 }}><path d="M3 4.5L6 7.5L9 4.5" stroke="var(--kai-text5)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </summary>
            <div style={{ padding: '0 20px 20px' }}>
              <SummaryContent />
            </div>
          </details>
        </main>
      </div>

      <BottomBar />
    </div>
  )
}
