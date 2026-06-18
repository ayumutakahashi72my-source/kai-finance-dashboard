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
  HomeIcon,
  UsersIcon,

  InfoIcon,
  AlertTriangleIcon,
  ZapIcon,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { LeaveHouseholdButton } from '@/components/settings/LeaveHouseholdButton'
import { LogoutButton } from '@/components/settings/LogoutButton'
import { ExportButton } from '@/components/settings/ExportButton'
import { CleanupCardTransfersButton } from '@/components/settings/CleanupCardTransfersButton'
import { FixCategoryColorsButton } from '@/components/settings/FixCategoryColorsButton'

function SettingsRow({
  icon: Icon,
  customIcon,
  title,
  description,
  href,
  accent = '#fb9477',
  value,
  titleColor,
  trailing,
}: {
  icon?: LucideIcon
  customIcon?: ReactNode
  title: string
  description?: string
  href: string
  accent?: string
  value?: string
  titleColor?: string
  trailing?: ReactNode
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-white/[0.04] active:bg-white/[0.06]"
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
        style={customIcon ? {} : {
          background: `color-mix(in srgb, ${accent} 11%, transparent)`,
          border: `1px solid color-mix(in srgb, ${accent} 22%, transparent)`,
        }}
      >
        {customIcon ?? (Icon && <Icon className="size-[17px]" style={{ color: accent }} />)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-medium leading-snug" style={{ color: titleColor ?? '#e8e8f0' }}>
          {title}
        </p>
        {description && (
          <p className="mt-0.5 text-[11.5px] leading-snug" style={{ color: '#5e5e72' }}>
            {description}
          </p>
        )}
      </div>
      {value && (
        <span style={{ fontSize: 11.5, color: '#8b8ba0', fontFamily: 'var(--font-mono),monospace', flexShrink: 0 }}>
          {value}
        </span>
      )}
      {trailing ?? <ChevronRightIcon className="size-[15px] shrink-0" style={{ color: '#3a3a50' }} />}
    </Link>
  )
}

function RowDivider() {
  return <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginLeft: '64px' }} />
}

function Section({ label, children, labelColor, bg, borderColor }: { label: string; children: ReactNode; labelColor?: string; bg?: string; borderColor?: string }) {
  return (
    <div>
      <div className="mb-2 px-1">
        <p style={{ fontSize: 11, color: labelColor ?? '#7070a0', fontWeight: 700, letterSpacing: '.10em', textTransform: 'uppercase' }}>
          {label}
        </p>
      </div>
      <div
        className="overflow-hidden rounded-[16px]"
        style={{
          background: bg ?? 'rgba(18,20,30,0.80)',
          backdropFilter: 'blur(24px) saturate(160%)',
          border: `1px solid ${borderColor ?? 'rgba(255,255,255,0.07)'}`,
        }}
      >
        {children}
      </div>
    </div>
  )
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const isDemo  = user.email === process.env.DEMO_USER_EMAIL

  const displayName = user.user_metadata?.full_name ?? user.email ?? 'ユーザー'
  const avatarUrl   = user.user_metadata?.avatar_url as string | undefined

  const { data: member } = await supabase
    .from('household_members')
    .select('is_admin, role, household_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()
  const isAdmin = !!member?.is_admin
  const isOwner = member?.role === 'owner'

  const { data: household } = member?.household_id
    ? await supabase.from('households').select('name').eq('id', member.household_id).single()
    : { data: null }

  return (
    <div className="min-h-screen" style={{ background: '#0c0a14' }}>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          zIndex: 0,
          backgroundImage: `
            radial-gradient(ellipse 600px 400px at 80% 10%, rgba(251,148,119,.07), transparent 55%),
            radial-gradient(ellipse 500px 300px at 10% 80%, rgba(122,167,255,.05), transparent 55%)
          `,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          zIndex: 1,
          backgroundImage: `linear-gradient(rgba(255,255,255,.011) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.011) 1px,transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      <Sidebar />

      <div className="relative min-h-screen lg:pl-[220px]" style={{ zIndex: 2 }}>
        <header
          className="sticky top-0 z-30 flex items-center justify-between px-5 py-[13px]"
          style={{
            background: 'rgba(8,8,14,.60)',
            backdropFilter: 'blur(24px)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <div className="lg:hidden"><KaiSystemBrand size="sm"/></div>
          <h1 className="hidden text-[16px] font-bold lg:block" style={{ color: '#f0f0f5' }}>設定</h1>
          <ProfileDropdown displayName={displayName} avatarUrl={avatarUrl} />
        </header>

        <main className="mx-auto max-w-xl space-y-5 px-4 py-5 pb-32 lg:pb-10">

          {/* ── プロフィールカード ── */}
          <div
            className="overflow-hidden rounded-[18px] px-5 py-5"
            style={{
              background: 'linear-gradient(135deg, rgba(251,148,119,0.08) 0%, rgba(18,20,30,0.90) 60%)',
              border: '1px solid rgba(251,148,119,0.15)',
              backdropFilter: 'blur(24px)',
            }}
          >
            <div className="flex items-center gap-4">
              <div style={{ padding: 1.5, borderRadius: 15, background: 'linear-gradient(135deg,#fb9477,#7aa7ff)', flexShrink: 0 }}>
                <div style={{ width: 54, height: 54, borderRadius: 13, background: '#0c0a14', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt={displayName} width={54} height={54} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: 22, fontWeight: 800, background: 'linear-gradient(135deg,#fb9477,#7aa7ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span style={{ position: 'absolute', bottom: 2, right: 2, width: 9, height: 9, borderRadius: '50%', background: '#4ade80', border: '2px solid #0c0a14', boxShadow: '0 0 6px rgba(74,222,128,.7)' }} />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold" style={{ color: '#f0f0f5', fontSize: 15 }}>{displayName}</p>
                <p className="mt-0.5 truncate" style={{ color: '#5e5e72', fontSize: 12 }}>{user.email}</p>
                <div style={{ display: 'flex', gap: 5, marginTop: 7, flexWrap: 'wrap' }}>
                  {isDemo ? (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(251,148,119,.12)', border: '1px solid rgba(251,148,119,.28)', color: '#fb9477', letterSpacing: '.05em' }}>
                      DEMO
                    </span>
                  ) : (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(66,133,244,.12)', border: '1px solid rgba(66,133,244,.28)', color: '#7aa7ff', letterSpacing: '.05em' }}>
                      Google
                    </span>
                  )}
                  {household?.name && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(122,167,255,.10)', border: '1px solid rgba(122,167,255,.20)', color: '#7aa7ff', letterSpacing: '.05em' }}>
                      {household.name}
                    </span>
                  )}
                  {isAdmin && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(167,139,250,.10)', border: '1px solid rgba(167,139,250,.22)', color: '#a78bfa', letterSpacing: '.05em' }}>
                      管理者
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── 世帯 ── */}
          <Section label="世帯">
            <SettingsRow
              icon={HomeIcon}
              title="世帯管理"
              description={household?.name ? `${household.name} · メンバー招待` : '世帯を作成'}
              href="/settings/admin/members"
              accent="#fb9477"
            />
            <RowDivider />
            <SettingsRow
              icon={UsersIcon}
              title="メンバー権限管理"
              description="世帯メンバーの役割を変更"
              href="/settings/admin/members"
              accent="#7aa7ff"
            />
            <RowDivider />
            <SettingsRow
              icon={TargetIcon}
              title="貯蓄目標"
              description="マイホーム頭金 · 月¥80,000"
              href="/settings/goals"
              accent="#4ade80"
            />
          </Section>

          {/* ── 連携（デモ以外） ── */}
          {!isDemo && (
            <Section label="連携">
              <SettingsRow
                customIcon={
                  <div style={{ width: 36, height: 36, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
                    <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                      <rect width="36" height="36" rx="9" fill="#f5c000"/>
                      <text x="18" y="25" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="800" fontSize="17" fill="#0a0a10" letterSpacing="-0.5">MF</text>
                    </svg>
                  </div>
                }
                title="Money Forward 連携"
                description="毎朝6:00に全口座を自動取込"
                href="/settings/integrations/mf"
              />
            </Section>
          )}

          {/* ── 通知 ── */}
          <Section label="通知">
            <SettingsRow
              icon={BellIcon}
              title="プッシュ通知"
              description="月次レポート・異常検知"
              href="/settings/notifications"
              accent="#fbbf24"
            />
            <RowDivider />
            <SettingsRow
              icon={AlertTriangleIcon}
              title="予算超過アラート"
              description="カテゴリ予算の90%到達時"
              href="/settings/notifications"
              accent="#fb7185"
            />
          </Section>

          {/* ── AI設定 ── */}
          <Section
            label="AI設定"
            labelColor="#a78bfa"
            bg="linear-gradient(180deg, rgba(167,139,250,0.06), rgba(20,22,32,0.88))"
            borderColor="rgba(167,139,250,0.20)"
          >
            {(isAdmin || isDemo) && (
              <>
                <SettingsRow
                  customIcon={
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(167,139,250,.16)', border: '1px solid rgba(167,139,250,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <BarChart2 size={16} strokeWidth={1.9} style={{ color: '#a78bfa' }}/>
                    </div>
                  }
                  title="AI運用分析"
                  titleColor="#a78bfa"
                  description="キャッシュ率・分類精度・コスト"
                  href="/admin/analytics"
                  accent="#a78bfa"
                  value="86%"
                />
                <RowDivider />
              </>
            )}
            <SettingsRow
              icon={TagIcon}
              title="カテゴリ管理"
              description="支出カテゴリの追加・編集・削除"
              href="/settings/categories"
              accent="#5eead4"
            />
            <RowDivider />
            <SettingsRow
              customIcon={
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(251,148,119,.12)', border: '1px solid rgba(251,148,119,.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Brain size={16} strokeWidth={2} style={{ color: '#fb9477' }}/>
                </div>
              }
              title="分類修正フィードバック"
              description="あなたの修正がRAGに学習されます"
              href="/settings/corrections"
              accent="#fb9477"
            />
            <RowDivider />
            <div className="flex items-center gap-3.5 px-4 py-3.5">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
                style={{ background: 'rgba(34,211,238,.12)', border: '1px solid rgba(34,211,238,.22)' }}
              >
                <ZapIcon className="size-[17px]" style={{ color: '#22d3ee' }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium leading-snug" style={{ color: '#e8e8f0' }}>
                  レシート自動分類
                </p>
                <p className="mt-0.5 text-[11.5px] leading-snug" style={{ color: '#5e5e72' }}>
                  OCR後にAIで自動カテゴリ付け（常時有効）
                </p>
              </div>
              <div style={{ width: 44, height: 25, borderRadius: 13, background: '#4ade80', position: 'relative', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 2.5, left: 21.5, width: 20, height: 20, borderRadius: '50%', background: '#0c0a14' }} />
              </div>
            </div>
          </Section>

          {/* ── 表示 ── */}
          <Section label="表示">
            <div className="flex items-center gap-3.5 px-4 py-3.5">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
                style={{ background: 'rgba(255,255,255,.05)' }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#c8c8d8" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium leading-snug" style={{ color: '#e8e8f0' }}>テーマ</p>
              </div>
              <span style={{ fontSize: 11.5, color: '#8b8ba0', fontFamily: 'var(--font-mono),monospace' }}>ダーク</span>
            </div>
          </Section>

          {/* ── データ・その他 ── */}
          <Section label="データ・その他">
            <ExportButton />
            <RowDivider />
            <SettingsRow
              icon={InfoIcon}
              title="プライバシー・データ取扱い"
              href="/legal/privacy"
              accent="#c8c8d8"
            />
          </Section>

          {/* ── メンテナンス（isAdmin のみ） ── */}
          {isAdmin && (
            <Section label="メンテナンス">
              <FixCategoryColorsButton />
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }} />
              <CleanupCardTransfersButton />
              {!isDemo && (
                <>
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }} />
                  <LeaveHouseholdButton isOwner={isOwner} />
                </>
              )}
            </Section>
          )}

          {/* ── ログアウト ── */}
          <div style={{ padding: '4px 0' }}>
            <LogoutButton />
          </div>

          {/* ビルド情報 */}
          <div style={{ padding: '8px 4px', display: 'flex', justifyContent: 'center' }}>
            <p style={{ fontSize: 11, color: '#2e2e45', fontFamily: 'var(--font-mono),monospace', letterSpacing: '.08em' }}>
              KAI v2.4.0 · Build 2026.06
            </p>
          </div>
        </main>
      </div>

      <BottomBar />
    </div>
  )
}
