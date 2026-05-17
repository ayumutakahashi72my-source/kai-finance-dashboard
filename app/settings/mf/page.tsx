import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomBar } from '@/components/layout/BottomBar'
import { MfSettingsForm } from '@/components/settings/MfSettingsForm'
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
  const fullName: string = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? ''
  const initial = fullName.charAt(0).toUpperCase()

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
          backgroundImage: `linear-gradient(rgba(255,255,255,.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.012) 1px,transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      <Sidebar />

      <div className="relative min-h-screen lg:pl-[220px]" style={{ zIndex: 2 }}>
        {/* ── KAI-style header ── */}
        <header
          className="sticky top-0 z-30 flex items-center gap-3 px-4 py-[14px]"
          style={{
            background: 'rgba(8,8,14,.55)',
            backdropFilter: 'blur(24px)',
            borderBottom: `1px solid ${KAI.border2}`,
          }}
        >
          <Link
            href="/settings"
            style={{
              width: 30, height: 30, borderRadius: 9, border: 'none',
              background: 'rgba(255,255,255,.06)', color: KAI.text2,
              fontSize: 18, cursor: 'pointer', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              textDecoration: 'none', lineHeight: 1,
            }}
          >‹</Link>

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

          {/* User avatar */}
          <div style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(251,148,119,.8) 0%, rgba(122,167,255,.8) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: '#fff',
          }}>{initial}</div>
        </header>

        <main className="mx-auto max-w-2xl px-4 py-5 pb-32 lg:pb-10">
          <MfSettingsForm
            initialEmail={settings?.mf_email ?? null}
            initialEnabled={!!(settings?.mf_email && settings?.mf_password)}
          />
        </main>
      </div>

      <BottomBar />
    </div>
  )
}
