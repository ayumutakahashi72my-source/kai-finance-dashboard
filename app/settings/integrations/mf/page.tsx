import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeftIcon } from 'lucide-react'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomBar } from '@/components/layout/BottomBar'
import { ProfileDropdown } from '@/components/layout/ProfileDropdown'
import { MfSettingsForm } from '@/components/settings/MfSettingsForm'
import { MfSyncLogs } from '@/components/settings/MfSyncLogs'
import { KAI } from '@/lib/kai-tokens'

export default async function MfSettingsPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const { data: household } = await supabase
    .from('households')
    .select('id, settings')
    .eq('owner_id', user.id)
    .limit(1)
    .single()

  if (!household) redirect('/')

  const settings = household.settings as { mf_email?: string; mf_password?: string } | null
  const displayName: string = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? 'ユーザー'
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined

  return (
    <div className="min-h-screen" style={{ background: KAI.bg }}>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          zIndex: 0,
          backgroundImage: `radial-gradient(ellipse 600px 400px at 80% 20%, rgba(167,139,250,.10), transparent 55%),radial-gradient(ellipse 500px 300px at 20% 80%, rgba(251,148,119,.06), transparent 55%)`,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          zIndex: 1,
          backgroundImage: `linear-gradient(${KAI.gridLine} 1px,transparent 1px),linear-gradient(90deg,${KAI.gridLine} 1px,transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      <Sidebar />

      <div className="relative min-h-screen lg:pl-[220px]" style={{ zIndex: 2 }}>
        <header
          className="sticky top-0 z-30 flex items-center gap-3 px-4 py-[14px]"
          style={{
            background: KAI.headerBg,
            backdropFilter: 'blur(24px)',
            borderBottom: `1px solid ${KAI.border2}`,
          }}
        >
          <Link
            href="/settings"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] transition-colors hover:bg-[var(--kai-overlay-weak)]"
            style={{ color: KAI.text3 }}
          >
            <ChevronLeftIcon className="size-5" />
          </Link>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 9, color: KAI.text3, fontWeight: 700,
              letterSpacing: '.14em', textTransform: 'uppercase',
              fontFamily: 'var(--font-jetbrains), JetBrains Mono, monospace',
            }}>ADD ENTRY / MF</div>
            <div style={{
              fontSize: 17, fontWeight: 700, color: KAI.text1,
              marginTop: 2, letterSpacing: '-.02em', lineHeight: 1.2,
            }}>MoneyForward Me 連携</div>
          </div>

          <ProfileDropdown displayName={displayName} avatarUrl={avatarUrl} />
        </header>

        <main className="mx-auto max-w-2xl space-y-6 px-4 py-5 pb-32 lg:pb-10">
          <MfSettingsForm
            initialEmail={settings?.mf_email ?? null}
            initialEnabled={!!(settings?.mf_email && settings?.mf_password)}
          />

          <div
            className="rounded-[18px] p-5"
            style={{
              background: KAI.bgPanel,
              backdropFilter: 'blur(24px) saturate(160%)',
              border: `1px solid ${KAI.border}`,
            }}
          >
            <h2
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: KAI.text1,
                marginBottom: 12,
              }}
            >
              同期ログ
            </h2>
            <MfSyncLogs />
          </div>
        </main>
      </div>

      <BottomBar />
    </div>
  )
}
