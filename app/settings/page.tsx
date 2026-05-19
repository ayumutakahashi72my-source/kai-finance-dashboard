import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ProfileDropdown } from '@/components/layout/ProfileDropdown'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomBar } from '@/components/layout/BottomBar'
import { KaiSystemBrand } from '@/components/kai/shared'
import {
  TagIcon,
  BellIcon,
  ChevronRightIcon,
  TargetIcon,
  Brain,
  BarChart2,
  Crown,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

function MfIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="9" fill="#f5c000"/>
      <text x="18" y="25" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="800" fontSize="17" fill="#0a0a10" letterSpacing="-0.5">MF</text>
    </svg>
  )
}

function SettingsRow({
  icon: Icon,
  customIcon,
  title,
  description,
  href,
  accent = '#fb9477',
}: {
  icon?: LucideIcon
  customIcon?: ReactNode
  title: string
  description?: string
  href: string
  accent?: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3.5 px-5 py-4 transition-colors hover:bg-white/[0.04] active:bg-white/[0.06]"
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
        style={customIcon ? {} : {
          background: `color-mix(in srgb, ${accent} 11%, transparent)`,
          border: `1px solid color-mix(in srgb, ${accent} 18%, transparent)`,
        }}
      >
        {customIcon ?? (Icon && <Icon className="size-[18px]" style={{ color: accent }} />)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium leading-snug" style={{ color: '#e8e8f0' }}>
          {title}
        </p>
        {description && (
          <p className="mt-0.5 text-[12px] leading-snug" style={{ color: '#5e5e72' }}>
            {description}
          </p>
        )}
      </div>
      <ChevronRightIcon className="size-4 shrink-0" style={{ color: '#3a3a50' }} />
    </Link>
  )
}

function Divider() {
  return <div style={{ borderTop: '1px solid rgba(255,255,255,0.055)', marginLeft: '68px' }} />
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="overflow-hidden rounded-[18px]"
      style={{
        background: 'rgba(20,22,32,0.75)',
        backdropFilter: 'blur(24px) saturate(160%)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {children}
    </div>
  )
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const displayName = user.user_metadata?.full_name ?? user.email ?? 'ユーザー'
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined

  const { data: member } = await supabase
    .from('household_members')
    .select('is_admin')
    .eq('user_id', user.id)
    .limit(1)
    .single()
  const isAdmin = !!member?.is_admin

  return (
    <div className="min-h-screen" style={{ background: '#0c0a14' }}>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          zIndex: 0,
          backgroundImage: `radial-gradient(ellipse 600px 400px at 80% 20%, rgba(251,148,119,.09), transparent 55%),radial-gradient(ellipse 500px 300px at 20% 80%, rgba(122,167,255,.06), transparent 55%)`,
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
        <header
          className="sticky top-0 z-30 flex items-center justify-between px-6 py-[14px]"
          style={{
            background: 'rgba(8,8,14,.55)',
            backdropFilter: 'blur(24px)',
            borderBottom: '1px solid rgba(255,255,255,0.10)',
          }}
        >
          <div className="lg:hidden">
            <KaiSystemBrand size="sm"/>
          </div>
          <h1 className="hidden text-[17px] font-bold lg:block" style={{ color: '#f0f0f5' }}>
            設定
          </h1>
          <ProfileDropdown displayName={displayName} avatarUrl={avatarUrl} />
        </header>

        <main className="mx-auto max-w-2xl space-y-4 px-4 py-5 pb-32 lg:pb-10">
          {/* ユーザーカード — Direction C: gradient square avatar */}
          <Card>
            <div className="px-5 py-5">
              <div className="flex items-center gap-4">
                {/* gradient square avatar */}
                <div style={{ padding: 1.5, borderRadius: 14, background: 'linear-gradient(135deg,#fb9477,#7aa7ff)', flexShrink: 0 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 12, background: '#0c0a14', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarUrl} alt={displayName} width={52} height={52} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: 20, fontWeight: 800, background: 'linear-gradient(135deg,#fb9477,#7aa7ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        {displayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                    {/* status dot */}
                    <span style={{ position: 'absolute', bottom: 2, right: 2, width: 8, height: 8, borderRadius: '50%', background: '#4ade80', border: '2px solid #0c0a14', boxShadow: '0 0 6px rgba(74,222,128,.7)' }} />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold" style={{ color: '#f0f0f5', fontSize: 15 }}>{displayName}</p>
                  <p className="mt-0.5 truncate" style={{ color: '#5e5e72', fontSize: 12 }}>{user.email}</p>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: 'rgba(251,148,119,.10)', border: '1px solid rgba(251,148,119,.20)', color: '#fb9477', letterSpacing: '.04em' }}>
                      Google
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: 'rgba(122,167,255,.10)', border: '1px solid rgba(122,167,255,.20)', color: '#7aa7ff', letterSpacing: '.04em' }}>
                      HH-072
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* データ */}
          <div>
            <p style={{ fontSize: 11, color: '#5e5e72', fontWeight: 700, letterSpacing: '.10em', marginBottom: 8, paddingLeft: 4 }}>データ</p>
            <Card>
              <SettingsRow
                icon={TagIcon}
                title="カテゴリ管理"
                description="支出カテゴリの追加・編集・削除"
                href="/settings/categories"
              />
              <Divider />
              <SettingsRow
                icon={TargetIcon}
                title="目標管理"
                description="貯蓄目標・月次予算をAIが算出"
                href="/settings/goals"
                accent="#fb9477"
              />
              <Divider />
              <SettingsRow
                customIcon={
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(122,167,255,.12)', border: '1px solid rgba(122,167,255,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7aa7ff' }}><Brain size={17} strokeWidth={2}/></div>
                }
                title="AI修正フィードバック"
                description="カテゴリ修正の学習状況を確認"
                href="/settings/corrections"
                accent="#7aa7ff"
              />
            </Card>
          </div>

          {/* 連携 */}
          <div>
            <p style={{ fontSize: 11, color: '#5e5e72', fontWeight: 700, letterSpacing: '.10em', marginBottom: 8, paddingLeft: 4 }}>連携</p>
            <Card>
              <SettingsRow
                customIcon={<MfIcon size={36} />}
                title="MoneyForward Me 連携"
                description="毎朝 6:00 に取引を自動取込"
                href="/settings/integrations/mf"
              />
            </Card>
          </div>

          {/* アプリ */}
          <div>
            <p style={{ fontSize: 11, color: '#5e5e72', fontWeight: 700, letterSpacing: '.10em', marginBottom: 8, paddingLeft: 4 }}>アプリ</p>
            <Card>
              <SettingsRow
                icon={BellIcon}
                title="通知設定"
                description="月次レポートのプッシュ通知"
                href="/settings/notifications"
              />
            </Card>
          </div>

          {/* 管理者セクション（管理者のみ表示） */}
          {isAdmin && (
            <div>
              <p style={{ fontSize: 11, color: '#5e5e72', fontWeight: 700, letterSpacing: '.10em', marginBottom: 8, paddingLeft: 4 }}>管理者</p>
              <Card>
                <SettingsRow
                  customIcon={
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(251,148,119,.12)', border: '1px solid rgba(251,148,119,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fb9477' }}>
                      <BarChart2 size={17} strokeWidth={2}/>
                    </div>
                  }
                  title="AI 分析"
                  description="分類精度・コスト・キャッシュヒット率"
                  href="/admin/analytics"
                  accent="#fb9477"
                />
                <Divider />
                <SettingsRow
                  customIcon={
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(251,148,119,.12)', border: '1px solid rgba(251,148,119,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fb9477' }}>
                      <Crown size={17} strokeWidth={2}/>
                    </div>
                  }
                  title="メンバー権限管理"
                  description="世帯メンバーの管理者権限を変更"
                  href="/settings/admin/members"
                  accent="#fb9477"
                />
              </Card>
            </div>
          )}

          {/* ビルド情報 */}
          <div style={{ padding: '12px 4px', display: 'flex', justifyContent: 'center' }}>
            <p style={{ fontSize: 11, color: '#3e3e55', fontFamily: 'var(--font-mono),monospace', letterSpacing: '.08em' }}>
              kai v2.4 · build 20260515 · HH-072
            </p>
          </div>
        </main>
      </div>

      <BottomBar />
    </div>
  )
}
