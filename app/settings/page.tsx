import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomBar } from '@/components/layout/BottomBar'
import { LogoutButton } from '@/components/auth/LogoutButton'
import { MfSettingsForm } from '@/components/settings/MfSettingsForm'
import { MfSyncLogs } from '@/components/settings/MfSyncLogs'
import { CategoryList } from '@/components/categories/CategoryList'
import { getCategories } from '@/app/actions/categories'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-[18px] p-5"
      style={{
        background: 'rgba(20,22,32,0.7)',
        backdropFilter: 'blur(24px) saturate(160%)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <p className="mb-4 text-sm font-semibold" style={{ color: '#f0f0f5' }}>{title}</p>
      {children}
    </div>
  )
}

export default async function SettingsPage() {
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
  const categories = await getCategories()

  const displayName = user.user_metadata?.full_name ?? user.email ?? 'ユーザー'
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined

  return (
    <div className="min-h-screen" style={{ background: '#0a0a10' }}>
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ top: -160, width: 600, height: 600, borderRadius: '50%', background: 'rgba(94,234,212,0.04)', filter: 'blur(120px)' }}
        />
      </div>

      <Sidebar />

      <div className="relative min-h-screen lg:pl-[220px]">
        <header
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center gap-2.5 lg:hidden">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-[9px]"
              style={{ background: 'linear-gradient(135deg,#5eead4,#22d3ee)', boxShadow: '0 0 14px rgba(94,234,212,0.28)' }}
            >
              <span className="mono text-[13px] font-black text-[#0a0a10]">K</span>
            </div>
            <span className="mono text-[13px] font-bold tracking-[0.04em] text-[#f0f0f5]">KAKEIBO AI</span>
          </div>
          <h1 className="hidden text-[15px] font-bold lg:block" style={{ color: '#f0f0f5' }}>設定</h1>
        </header>

        <main className="mx-auto max-w-2xl space-y-4 px-4 py-5 pb-32 lg:pb-10">
          {/* ユーザー情報 */}
          <div
            className="flex items-center gap-4 rounded-[18px] p-5"
            style={{
              background: 'rgba(20,22,32,0.7)',
              backdropFilter: 'blur(24px) saturate(160%)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={displayName} width={52} height={52} className="h-13 w-13 rounded-full ring-2 ring-[#5eead4]/30" />
            ) : (
              <div
                className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full text-lg font-bold"
                style={{ background: 'rgba(94,234,212,0.15)', color: '#5eead4' }}
              >
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold" style={{ color: '#f0f0f5' }}>{displayName}</p>
              <p className="truncate text-sm" style={{ color: '#8b8ba0' }}>{user.email}</p>
            </div>
            <LogoutButton />
          </div>

          {/* カテゴリ管理 */}
          <Section title="カテゴリ管理">
            <CategoryList initial={categories} />
          </Section>

          {/* MoneyForward連携 */}
          <Section title="MoneyForward 連携">
            <MfSettingsForm
              initialEmail={settings?.mf_email ?? null}
              initialEnabled={!!(settings?.mf_email && settings?.mf_password)}
            />
          </Section>

          {/* 取り込みログ */}
          <Section title="取り込みログ">
            <MfSyncLogs />
          </Section>
        </main>
      </div>

      <BottomBar />
    </div>
  )
}
