import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ProfileDropdown } from '@/components/layout/ProfileDropdown'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomBar } from '@/components/layout/BottomBar'
import { KaiSystemBrand } from '@/components/kai/shared'
import { KAI } from '@/lib/kai-tokens'
import { ChevronRightIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { LeaveHouseholdButton } from '@/components/settings/LeaveHouseholdButton'
import { CleanupCardTransfersButton } from '@/components/settings/CleanupCardTransfersButton'
import { FixCategoryColorsButton } from '@/components/settings/FixCategoryColorsButton'
import { ThemeSegmented } from '@/components/settings/ThemeSegmented'
import { PushNotificationToggle, StaticToggle } from '@/components/settings/SettingsToggle'
import { LogoutButton } from '@/components/auth/LogoutButton'

const MONO: React.CSSProperties = { fontFamily: 'var(--font-mono), "JetBrains Mono", monospace' }

function GrpLabel({ children, color }: { children: string; color?: string }) {
  return (
    <div style={{
      fontSize: 10, color: color ?? KAI.text4, fontWeight: 700,
      letterSpacing: '.13em', textTransform: 'uppercase' as const,
      padding: '14px 6px 6px', ...MONO,
    }}>
      {children}
    </div>
  )
}

function Panel({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: KAI.cardBg, border: `1px solid ${KAI.border2}`,
      borderRadius: 16, overflow: 'hidden', ...style,
    }}>
      {children}
    </div>
  )
}

function Row({
  icon,
  iconBg,
  iconBorder,
  title,
  titleColor,
  subtitle,
  href,
  value,
  valueColor,
  rightSlot,
}: {
  icon: ReactNode
  iconBg: string
  iconBorder?: string
  title: string
  titleColor?: string
  subtitle?: string
  href?: string
  value?: string
  valueColor?: string
  rightSlot?: ReactNode
}) {
  const content = (
    <>
      <div style={{
        width: 30, height: 30, borderRadius: 9, flexShrink: 0,
        background: iconBg, border: iconBorder ? `1px solid ${iconBorder}` : undefined,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, color: titleColor ?? KAI.text1, fontWeight: 500 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 10.5, color: KAI.text3, marginTop: 2 }}>{subtitle}</div>}
      </div>
      {value && (
        <span style={{ fontSize: 11.5, color: valueColor ?? KAI.text3, ...(valueColor ? { fontWeight: 700, ...MONO } : {}) }}>
          {value}
        </span>
      )}
      {rightSlot}
      {href && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={KAI.text4} strokeWidth="2" style={{ flexShrink: 0 }}><path d="M9 18l6-6-6-6"/></svg>
      )}
    </>
  )

  const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px',
    textDecoration: 'none', cursor: href ? 'pointer' : 'default',
  }

  if (href) {
    return <Link href={href} style={rowStyle}>{content}</Link>
  }
  return <div style={rowStyle}>{content}</div>
}

function RowDivider() {
  return <div style={{ borderTop: `1px solid ${KAI.border}` }} />
}

// SVG icons (matching design spec exactly)
const HomeIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={KAI.coral} strokeWidth="1.9"><path d="M3 12L12 3l9 9"/><path d="M5 10v10h14V10"/></svg>
const UsersIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={KAI.blue} strokeWidth="1.9"><circle cx="9" cy="8" r="3.4"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 5a3 3 0 0 1 0 6"/><path d="M21 20a6 6 0 0 0-5-5.9"/></svg>
const ClockIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={KAI.success} strokeWidth="1.9"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
const LinkIcon2 = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={KAI.success} strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
const ChatIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={KAI.blue} strokeWidth="1.9"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
const BellIcon2 = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={KAI.warning} strokeWidth="1.9"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>
const AlertIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={KAI.danger} strokeWidth="1.9"><path d="M10.3 3.9a2 2 0 0 1 3.4 0l8 13.8A2 2 0 0 1 20 21H4a2 2 0 0 1-1.7-3.3z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
const BarChartIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={KAI.violet} strokeWidth="1.9"><line x1="6" y1="20" x2="6" y2="13"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="18" y1="20" x2="18" y2="9"/></svg>
const TagIcon2 = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={KAI.mint} strokeWidth="1.9"><path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10z"/><circle cx="7" cy="7" r="1.2" fill={KAI.mint}/></svg>
const RefreshIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={KAI.coral} strokeWidth="1.9"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>
const OcrIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={KAI.cyan} strokeWidth="1.9"><path d="M12 2v4"/><path d="M12 18v4"/><circle cx="12" cy="12" r="4"/></svg>
const TimerIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={KAI.text2} strokeWidth="1.9"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l2.5 2.5"/></svg>
const DownloadIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={KAI.text2} strokeWidth="1.9"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>
const InfoIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={KAI.text2} strokeWidth="1.9"><circle cx="12" cy="12" r="9"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const isDemo = user.email === process.env.DEMO_USER_EMAIL
  const displayName = user.user_metadata?.full_name ?? user.email ?? 'ユーザー'
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined

  const { data: member } = await supabase
    .from('household_members')
    .select('is_admin, role, household_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()
  const isAdmin = !!member?.is_admin
  const isOwner = member?.role === 'owner'
  const householdId = member?.household_id

  const [householdRes, memberCountRes, goalCountRes, correctionCountRes, categoryCountRes] = await Promise.all([
    householdId ? supabase.from('households').select('name').eq('id', householdId).single() : Promise.resolve({ data: null }),
    householdId ? supabase.from('household_members').select('id', { count: 'exact', head: true }).eq('household_id', householdId) : Promise.resolve({ count: 0 }),
    householdId ? supabase.from('goals').select('id', { count: 'exact', head: true }).eq('household_id', householdId) : Promise.resolve({ count: 0 }),
    householdId ? supabase.from('category_corrections').select('id', { count: 'exact', head: true }).eq('household_id', householdId) : Promise.resolve({ count: 0 }),
    householdId ? supabase.from('categories').select('id', { count: 'exact', head: true }).eq('household_id', householdId) : Promise.resolve({ count: 0 }),
  ])

  const householdName = householdRes.data?.name ?? 'マイホーム'
  const memberCount = (memberCountRes as { count: number | null }).count ?? 0
  const goalCount = (goalCountRes as { count: number | null }).count ?? 0
  const correctionCount = (correctionCountRes as { count: number | null }).count ?? 0
  const categoryCount = (categoryCountRes as { count: number | null }).count ?? 0

  return (
    <div className="min-h-screen" style={{ background: KAI.bgCard }}>
      <div aria-hidden className="pointer-events-none fixed inset-0" style={{ zIndex: 0, backgroundImage: `radial-gradient(ellipse 600px 400px at 80% 10%, rgba(167,139,250,.07), transparent 55%), radial-gradient(ellipse 500px 300px at 10% 80%, rgba(94,234,212,.05), transparent 55%)` }} />
      <div aria-hidden className="pointer-events-none fixed inset-0" style={{ zIndex: 1, backgroundImage: `linear-gradient(${KAI.gridLine} 1px,transparent 1px),linear-gradient(90deg,${KAI.gridLine} 1px,transparent 1px)`, backgroundSize: '40px 40px' }} />

      <Sidebar />

      <div className="relative min-h-screen lg:pl-[220px]" style={{ zIndex: 2 }}>
        <header
          className="sticky top-0 z-30 flex items-center justify-between px-5 py-[13px]"
          style={{ background: KAI.headerBg, backdropFilter: 'blur(24px)', borderBottom: `1px solid ${KAI.border2}` }}
        >
          <div className="lg:hidden"><KaiSystemBrand size="sm" /></div>
          <h1 className="hidden text-[22px] font-bold lg:block" style={{ color: KAI.text1 }}>設定</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(94,234,212,.10)', border: '1px solid rgba(94,234,212,.25)', borderRadius: 99, padding: '5px 11px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: KAI.mint }} />
              <span style={{ fontSize: 10.5, fontWeight: 700, color: KAI.mint }}>同期済み</span>
            </div>
            <ProfileDropdown displayName={displayName} avatarUrl={avatarUrl} />
          </div>
        </header>

        <main className="mx-auto max-w-xl space-y-1 px-4 py-5 pb-32 lg:pb-10">

          {/* ── プロフィール ── */}
          <Panel>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px' }}>
              <div style={{
                width: 50, height: 50, borderRadius: 15, flexShrink: 0, overflow: 'hidden',
                background: `linear-gradient(135deg, ${KAI.coral}, ${KAI.blue})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" width={50} height={50} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: 21, fontWeight: 800, color: KAI.bg }}>{displayName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15.5, fontWeight: 600, color: KAI.text1, display: 'flex', alignItems: 'center', gap: 7 }}>
                  {displayName}
                </div>
                <div style={{ fontSize: 11, color: KAI.text3, marginTop: 2 }}>{user.email}</div>
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, color: KAI.coral, background: 'rgba(251,148,119,.12)', border: '1px solid rgba(251,148,119,.25)', borderRadius: 6, padding: '3px 7px', ...MONO }}>
                {isDemo ? 'DEMO' : 'PRO'}
              </span>
              <ChevronRightIcon size={16} style={{ color: KAI.text3, flexShrink: 0 }} />
            </div>
          </Panel>

          {/* ── 世帯 ── */}
          <GrpLabel>世帯</GrpLabel>
          <Panel>
            <Row icon={<HomeIcon />} iconBg="rgba(251,148,119,.12)" title="世帯管理" href="/settings/admin/members" value={householdName} />
            <RowDivider />
            <Row icon={<UsersIcon />} iconBg="rgba(122,167,255,.12)" title="メンバー管理" href="/settings/admin/members" value={`${memberCount}名`} />
            <RowDivider />
            <Row icon={<ClockIcon />} iconBg="rgba(74,222,128,.12)" title="貯蓄目標" subtitle={`月次予算をAIが算出`} href="/settings/goals" value={`${goalCount}件`} />
          </Panel>

          {/* ── 連携 ── */}
          {!isDemo && (
            <>
              <GrpLabel>連携</GrpLabel>
              <Panel>
                <Row icon={<LinkIcon2 />} iconBg="rgba(74,222,128,.12)" iconBorder="rgba(74,222,128,.22)" title="Money Forward 連携" subtitle="毎朝6:00 自動取込" href="/settings/integrations/mf" />
                <RowDivider />
                <Row icon={<ChatIcon />} iconBg="rgba(122,167,255,.12)" title="同期ログ" subtitle="直近30日" href="/settings/mf" />
              </Panel>
            </>
          )}

          {/* ── 通知 ── */}
          <GrpLabel>通知</GrpLabel>
          <Panel>
            <Row icon={<BellIcon2 />} iconBg="rgba(251,191,36,.12)" title="プッシュ通知" subtitle="月次レポート・異常検知" rightSlot={<PushNotificationToggle />} />
            <RowDivider />
            <Row icon={<AlertIcon />} iconBg="rgba(251,113,133,.12)" title="予算超過アラート" subtitle="カテゴリ予算の90%到達時" rightSlot={<StaticToggle defaultOn />} />
          </Panel>

          {/* ── AI設定 ── */}
          <GrpLabel color={KAI.violet}>AI設定</GrpLabel>
          <Panel style={{
            background: `linear-gradient(180deg,rgba(167,139,250,.06),${KAI.cardBg})`,
            borderColor: 'rgba(167,139,250,.20)',
          }}>
            <div style={{ background: 'rgba(167,139,250,.06)' }}>
              <Row
                icon={<BarChartIcon />}
                iconBg="rgba(167,139,250,.16)"
                iconBorder="rgba(167,139,250,.3)"
                title="AI運用分析"
                titleColor={KAI.violet}
                subtitle="キャッシュ率・分類精度・コスト"
                href={isAdmin ? '/settings/ai-analytics' : undefined}
                valueColor={KAI.mint}
              />
            </div>
            <RowDivider />
            <Row icon={<TagIcon2 />} iconBg="rgba(94,234,212,.12)" title="カテゴリ管理" subtitle={`${categoryCount}カテゴリ`} href="/settings/categories" />
            <RowDivider />
            <Row icon={<RefreshIcon />} iconBg="rgba(251,148,119,.12)" title="分類修正フィードバック" subtitle="あなたの修正がRAGに学習されます" href="/settings/corrections" value={`${correctionCount}件`} />
            <RowDivider />
            <Row icon={<OcrIcon />} iconBg="rgba(34,211,238,.12)" title="レシート自動分類" subtitle="OCR後にAIで自動カテゴリ付け" rightSlot={<StaticToggle defaultOn />} />
          </Panel>

          {/* ── 表示 ── */}
          <GrpLabel>表示</GrpLabel>
          <Panel style={{ padding: '13px 15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 13.5, color: KAI.text1 }}>テーマ</span>
            </div>
            <ThemeSegmented />
          </Panel>
          <div style={{ marginTop: 8 }}>
            <Panel>
              <Row icon={<TimerIcon />} iconBg="rgba(255,255,255,.05)" title="通貨・週開始日" value="¥ JPY · 月" />
            </Panel>
          </div>

          {/* ── データ・その他 ── */}
          <GrpLabel>データ・その他</GrpLabel>
          <Panel>
            <Row icon={<DownloadIcon />} iconBg="rgba(255,255,255,.05)" title="データをエクスポート" subtitle="CSV / JSON" href="/legal/data" />
            <RowDivider />
            <Row icon={<InfoIcon />} iconBg="rgba(255,255,255,.05)" title="プライバシー・データ取扱い" href="/legal/privacy" />
          </Panel>

          {/* ── メンテナンス（管理者のみ） ── */}
          {isAdmin && (
            <>
              <GrpLabel>メンテナンス</GrpLabel>
              <Panel>
                <FixCategoryColorsButton />
                <div style={{ borderTop: `1px solid ${KAI.border}` }} />
                <CleanupCardTransfersButton />
                {!isDemo && (
                  <>
                    <div style={{ borderTop: `1px solid ${KAI.border}` }} />
                    <LeaveHouseholdButton isOwner={isOwner} />
                  </>
                )}
              </Panel>
            </>
          )}

          {/* ── ログアウト ── */}
          <div style={{ padding: '14px 0 4px' }}>
            <LogoutButton />
          </div>

          {/* ── バージョン ── */}
          <div style={{ textAlign: 'center', fontSize: 10, color: KAI.text4, ...MONO, paddingBottom: 6 }}>
            KAI v2.4.0 · Build 2026.06
          </div>
        </main>
      </div>

      <BottomBar />
    </div>
  )
}
