'use client'

/* ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  MFConnectScreen.tsx — DESIGN-LOCKED                                     ║
 * ║                                                                          ║
 * ║  この component は **見た目だけ** を定義する。Direction C "Warm           ║
 * ║  Companion" のデザインハンドオフ（design_handoff_kai_finance）に厳密に   ║
 * ║  準拠する。                                                              ║
 * ║                                                                          ║
 * ║  ┌─ Claude Code への絶対ルール ───────────────────────────────────────┐ ║
 * ║  │ 1. JSX 構造（header → hero card → feature rows → form → warning  │ ║
 * ║  │    → buttons）の入れ子と並び順を **絶対に変更しない**。          │ ║
 * ║  │ 2. style 値（色・余白・border-radius・font-size・gap）を         │ ║
 * ║  │    変更しない。コーラル/ブルーのグラデは固定 (`#fb9477 → #7aa7ff`)│ ║
 * ║  │ 3. 機能（onClick の中身、状態、API、controlled input 等）は      │ ║
 * ║  │    **props で受け取り**、内部で勝手に useState/fetch を持たない。│ ║
 * ║  │ 4. input を controlled にする時は value/onChange だけ差し替え、  │ ║
 * ║  │    周囲の <div> や className="kai-input" を維持する。            │ ║
 * ║  │ 5. ボタンは **className="kai-btn kai-btn-primary"** を使う。     │ ║
 * ║  │    inline style で gradient を書かない（grad は globals.css で   │ ║
 * ║  │    locked）。                                                    │ ║
 * ║  │ 6. 新しい UI 要素を追加する場合は、既存セクション間の `gap: 12`  │ ║
 * ║  │    を保ったまま追加する。                                        │ ║
 * ║  │ 7. このファイルは PhoneShell に包まれている = デザインプレビュー │ ║
 * ║  │    用。本番ページからレンダーするのは MfSettingsForm.tsx。       │ ║
 * ║  └────────────────────────────────────────────────────────────────────┘ ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { KAI } from '@/lib/kai-tokens'
import {
  Icon,
  KaiLogo,
  CAvatar,
  PhoneShell,
  MONO_STYLE,
} from '@/components/kai/shared'

// ──────────────────────────────────────────────────────────────────
// Static design data — 値は触らないこと
// ──────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon:  'sparkle' as const,
    bg:    'rgba(251,148,119,.18)',
    color: KAI.coral,
    title: '毎朝の自動同期',
    sub:   '6:00 に当月の全口座を取込',
  },
  {
    icon:  'bank' as const,
    bg:    'rgba(122,167,255,.14)',
    color: KAI.blue,
    title: '複数口座まとめて',
    sub:   'クレカ・銀行・電子マネー',
  },
  {
    icon:  'lock' as const,
    bg:    'rgba(251,148,119,.18)',
    color: KAI.coral,
    title: '認証情報は暗号化',
    sub:   '閲覧専用アクセスのみ',
  },
] as const

// ──────────────────────────────────────────────────────────────────
// Props — 機能は親から渡す
// ──────────────────────────────────────────────────────────────────

interface MFConnectScreenProps {
  onBack?:    () => void
  onConnect?: () => void
  firstName?: string
}

// ──────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────

export function MFConnectScreenMobile({
  onBack,
  onConnect,
  firstName = 'あ',
}: MFConnectScreenProps) {
  return (
    <PhoneShell glow="warm" bg={KAI.bgCard}>

      {/* ─── Header ──────────────────────────────────────── */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 18px',
        }}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label="戻る"
          style={{
            width: 30, height: 30, borderRadius: 9,
            border: 'none',
            background: 'rgba(255,255,255,.06)',
            color: KAI.text2,
            fontSize: 16,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >‹</button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 9, color: KAI.text3, fontWeight: 700,
              letterSpacing: '.14em', textTransform: 'uppercase',
              ...MONO_STYLE,
            }}
          >ADD ENTRY / MF</div>
          <div
            style={{
              fontSize: 17, fontWeight: 700, color: KAI.text1,
              marginTop: 2, letterSpacing: '-.02em', lineHeight: 1.2,
            }}
          >MoneyForward Me 連携</div>
        </div>

        <CAvatar size={32} initial={firstName.charAt(0)}/>
      </header>

      {/* ─── Scrollable body ─────────────────────────────── */}
      <div
        style={{
          flex: 1,
          padding: '8px 18px 0',
          display: 'flex', flexDirection: 'column', gap: 12,
          overflowY: 'auto',
        }}
      >
        {/* ─── Hero connection card ──────────────────────── */}
        {/*  kai ⇄ MF + 流れるドット + ヘッドライン                 */}
        {/*  ★この section を **削除/再構成しないこと**            */}
        <section
          style={{
            background: 'rgba(167,139,250,.06)',
            border:     '1px solid rgba(167,139,250,.22)',
            borderRadius: 20,
            padding: '28px 20px 22px',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 20,
            animation: 'kai-rise .6s ease-out both',
            boxShadow: '0 0 40px rgba(167,139,250,.05)',
          }}
        >
          {/* KAI ─── moving dot ─── MF */}
          <div
            style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', width: '100%',
            }}
          >
            {/* KAI icon (gradient frame) */}
            <div
              style={{
                padding: 2.5, borderRadius: 18, flexShrink: 0,
                background: `linear-gradient(135deg, ${KAI.coral}E6 0%, ${KAI.blue}D9 100%)`,
              }}
            >
              <div
                style={{
                  width: 72, height: 72, borderRadius: 16,
                  background: '#131020',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <KaiLogo size={32} gradientId="mfc-screen-kai"/>
              </div>
            </div>

            {/* Animated line + moving dot */}
            <div
              style={{
                flex: 1, maxWidth: 90, height: 2,
                position: 'relative', margin: '0 8px',
              }}
            >
              {/* track */}
              <div
                style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(255,255,255,.15)',
                  borderRadius: 99,
                }}
              />
              {/* moving dot — CSS var で線長を渡す（globals.css の mfc-dot が参照） */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%', left: 0,
                  width: 10, height: 10, borderRadius: '50%',
                  background: KAI.coral,
                  boxShadow: `0 0 10px ${KAI.coral}99`,
                  ['--mfc-line' as string]: '80px',
                  animation: 'mfc-dot 2s cubic-bezier(.45,0,.55,1) infinite',
                }}
              />
            </div>

            {/* MF icon */}
            <div
              style={{
                width: 72, height: 72, borderRadius: 16, flexShrink: 0,
                background: 'rgba(14,24,52,.9)',
                border: `1px solid ${KAI.blue}47`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, fontWeight: 800,
                color: KAI.blue, letterSpacing: '-.04em',
              }}
            >MF</div>
          </div>

          {/* Headline + subtitle */}
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: 18, fontWeight: 700, color: KAI.text1,
                letterSpacing: '-.02em',
              }}
            >kai に MF Me を接続</div>
            <div
              style={{
                fontSize: 12.5, color: KAI.text3,
                marginTop: 7, lineHeight: 1.65,
              }}
            >
              連携すると、毎朝 6:00 に当月の取引が自動で取込まれます。
            </div>
          </div>
        </section>

        {/* ─── Feature rows ──────────────────────────────── */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: 'rgba(255,255,255,.02)',
                border:     '1px solid rgba(255,255,255,.07)',
                borderRadius: 16,
                padding: '14px 16px',
                animation: `kai-rise .5s ${.12 + i * .07}s ease-out both`,
              }}
            >
              <div
                style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: f.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: f.color,
                }}
              >
                <Icon name={f.icon} size={20} stroke={1.9}/>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: KAI.text1 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: KAI.text3, marginTop: 2 }}>{f.sub}</div>
              </div>
            </div>
          ))}
        </section>

        {/* ─── Login form ───────────────────────────────── */}
        <section style={{ animation: 'kai-rise .5s .33s ease-out both' }}>
          <div
            style={{
              fontSize: 10, color: KAI.text3, fontWeight: 700,
              letterSpacing: '.12em', textTransform: 'uppercase',
              marginBottom: 10,
            }}
          >MF ME ログイン</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <FieldWrap label="メールアドレス">
              <input
                type="email"
                placeholder="example@email.com"
                className="kai-input"
                autoComplete="email"
              />
            </FieldWrap>

            <FieldWrap label="パスワード">
              <input
                type="password"
                placeholder="••••••••"
                className="kai-input"
                autoComplete="current-password"
              />
            </FieldWrap>
          </div>
        </section>

        {/* ─── Warning ──────────────────────────────────── */}
        <section
          style={{
            background: 'rgba(251,191,36,.06)',
            border:     '1px solid rgba(251,191,36,.28)',
            borderRadius: 14, padding: '12px 14px',
            display: 'flex', gap: 9, alignItems: 'flex-start',
            animation: 'kai-rise .5s .42s ease-out both',
          }}
        >
          <span style={{ fontSize: 14, color: KAI.warning, flexShrink: 0, marginTop: 1 }}>⚠</span>
          <div style={{ fontSize: 12, color: 'rgba(251,191,36,.92)', lineHeight: 1.6 }}>
            非公式 API を使用。MF 仕様変更で停止する可能性あり。専用 MF サブアカウント推奨
          </div>
        </section>

        {/* ─── Action buttons ───────────────────────────── */}
        <section
          style={{
            display: 'flex', gap: 10,
            paddingBottom: 28, marginTop: 4,
            animation: 'kai-rise .5s .48s ease-out both',
          }}
        >
          <button
            type="button"
            className="kai-btn kai-btn-secondary"
            onClick={onBack}
            style={{ flex: 1 }}
          >戻る</button>

          <button
            type="button"
            className="kai-btn kai-btn-primary"
            onClick={onConnect}
            style={{ flex: 2 }}
          >
            <Icon name="link" size={16} stroke={2.2}/>
            連携する
          </button>
        </section>
      </div>
    </PhoneShell>
  )
}

// ──────────────────────────────────────────────────────────────────
// FieldWrap — label + input のラッパ。デザインで何度も使うので切り出し。
// 構造を変えない限り、children に好きな input を入れていい。
// ──────────────────────────────────────────────────────────────────

function FieldWrap({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,.02)',
        border:     '1px solid rgba(255,255,255,.08)',
        borderRadius: 14,
        padding: '12px 14px',
      }}
    >
      <div
        style={{
          fontSize: 11, color: KAI.text3, fontWeight: 600,
          marginBottom: 7,
        }}
      >{label}</div>
      {children}
    </div>
  )
}
