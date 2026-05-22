// components/kai/HairlineSplash.tsx
// 起動画面 ①-B "Hairline Frame" の Next.js 実装。
//
// 用途:
//   - PWA 起動直後に React 側で短時間 (約 1.6s) 表示する fade-out 付きスプラッシュ。
//   - Server Component layout.tsx から <HairlineSplash> を出すか、
//     /app/loading.tsx のフォールバックとして使う。
//
/* ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  DESIGN-LOCKED — Claude Code への絶対ルール                              ║
 * ║   1. ロックアップの構成 (上ラベル → 波マーク → kai 文字 → メタ) を       ║
 * ║      変えない。コーナーマーカーの位置・線幅・色も変えない。              ║
 * ║   2. アニメは globals.css の kai-splash-* / kai-splash-draw を使う。     ║
 * ║   3. テキスト 4 つ (HOUSEHOLD・LEDGER / kai / 家計簿管理 / HH-072・v2.4  ║
 * ║      ・2026) は文字以外は触らない。                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝ */

'use client'

import * as React from 'react'
import { KAI } from '@/lib/kai-tokens'

interface HairlineSplashProps {
  /** ロゴ描画 → 完全消えるまで (ms)。デフォルト 1800ms。 */
  autoHideMs?: number
  /** 強制的に表示・非表示を制御したい場合 */
  visible?: boolean
  /** 表示が終わった時 (autoHide 完了 or visible=false) のコールバック */
  onDone?: () => void
}

export function HairlineSplash({
  autoHideMs = 3000,
  visible,
  onDone,
}: HairlineSplashProps) {
  const [show, setShow] = React.useState(true)
  const [topPad, setTopPad] = React.useState(0)

  // VisualViewport offset補正: OAuthリダイレクト後にChrome URLバーが表示される間、
  // position:fixed は大きいビューポートで計算されるが視覚的ビューポートは小さい。
  // offsetTop でその差を検出して中央コンテナに paddingTop として適用する。
  React.useEffect(() => {
    const vv = window.visualViewport
    const update = () => {
      const vvOffset = vv?.offsetTop ?? 0
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      if (vvOffset > 0) {
        // ブラウザモード: URLバー分だけ上にずれる
        setTopPad(vvOffset)
      } else if (isStandalone) {
        // スタンドアロンPWA: ステータスバー分の補正 (safe-area or 24px fallback)
        const el = document.createElement('div')
        el.style.cssText = 'height:env(safe-area-inset-top,0px);width:0;position:absolute;visibility:hidden;'
        document.body.appendChild(el)
        const sat = el.offsetHeight
        document.body.removeChild(el)
        setTopPad(sat > 0 ? sat : 24)
      } else {
        setTopPad(0)
      }
    }
    update()
    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)
    return () => {
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
    }
  }, [])

  // Restore scroll restoration after splash hides (was set to 'manual' in layout.tsx <script>)
  React.useEffect(() => {
    if (!show && 'scrollRestoration' in history) {
      history.scrollRestoration = 'auto'
    }
  }, [show])

  React.useEffect(() => {
    if (visible === false) {
      setShow(false)
      const t = setTimeout(() => onDone?.(), 320)
      return () => clearTimeout(t)
    }
    if (visible === true) {
      setShow(true)
      return
    }
    // visible 未指定: autoHide
    const t = setTimeout(() => {
      setShow(false)
      const t2 = setTimeout(() => onDone?.(), 320)
      return () => clearTimeout(t2)
    }, autoHideMs)
    return () => clearTimeout(t)
  }, [visible, autoHideMs, onDone])

  return (
    <div
      aria-hidden={!show}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: KAI.bg,
        opacity: show ? 1 : 0,
        pointerEvents: show ? 'auto' : 'none',
        transition: 'opacity .32s ease',
        fontFamily: 'var(--font-sans), Inter, sans-serif',
        color: KAI.text1,
        overflow: 'hidden',
      }}
    >
      {/* スポットライト風グロー */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 420px 280px at 50% -10%, rgba(245,212,184,.06), transparent 60%)',
        }}
      />

      {/* hairline frame の四隅 */}
      <HairlineCorner pos="tl" />
      <HairlineCorner pos="tr" />
      <HairlineCorner pos="bl" />
      <HairlineCorner pos="br" />

      {/* 上ラベル (hairline frame 上端に切り込み風) */}
      <div
        style={{
          position: 'absolute',
          top: 'calc(env(safe-area-inset-top, 22px) + 6px)',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '0 12px',
          background: KAI.bg,
          animation: 'kai-splash-fade-soft .9s .4s both',
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-mono), JetBrains Mono, monospace',
            fontSize: 9,
            letterSpacing: '.32em',
            color: KAI.text3,
            fontWeight: 600,
          }}
        >
          HOUSEHOLD · LEDGER
        </p>
      </div>

      {/* 中央のロックアップ */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          paddingTop: topPad,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
        }}
      >
        <SplashWaveMark
          size={72}
          animateDelay={0.35}
          animateDuration={1.3}
          from={KAI.peach}
          to="#e8e6f0"
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
            animation: 'kai-splash-fade 1s 1.1s both',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 46,
              fontWeight: 300,
              letterSpacing: '.06em',
              color: KAI.text1,
              lineHeight: 1,
            }}
          >
            kai
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 24, height: 1, background: 'rgba(255,255,255,.22)' }} />
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-mono), JetBrains Mono, monospace',
                fontSize: 9,
                letterSpacing: '.32em',
                color: KAI.text3,
                fontWeight: 600,
              }}
            >
              家計簿管理
            </p>
            <span style={{ width: 24, height: 1, background: 'rgba(255,255,255,.22)' }} />
          </div>
        </div>
      </div>

      {/* 下端のメタ情報 */}
      <div
        style={{
          position: 'absolute',
          bottom: 'calc(env(safe-area-inset-bottom, 22px) + 4px)',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '0 12px',
          background: KAI.bg,
          fontFamily: 'var(--font-mono), JetBrains Mono, monospace',
          fontSize: 9,
          letterSpacing: '.22em',
          color: KAI.text5,
          fontWeight: 600,
          animation: 'kai-splash-fade-soft 1s 1.6s both',
        }}
      >
        <span>HH-072</span>
        <span style={{ width: 3, height: 3, borderRadius: '50%', background: KAI.text5 }} />
        <span>v2.4</span>
        <span style={{ width: 3, height: 3, borderRadius: '50%', background: KAI.text5 }} />
        <span>2026</span>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// 内部部品
// ──────────────────────────────────────────────────────────────────

function HairlineCorner({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const c = 'rgba(240,240,245,.32)'
  const len = 14
  const insetX = 'env(safe-area-inset-left, 22px)'
  const insetY = 'env(safe-area-inset-top, 22px)'
  const insetXR = 'env(safe-area-inset-right, 22px)'
  const insetYB = 'env(safe-area-inset-bottom, 22px)'
  const base: React.CSSProperties = {
    position: 'absolute',
    width: len,
    height: len,
    animation: 'kai-splash-fade-soft .7s .2s both',
  }
  if (pos === 'tl')
    return <span aria-hidden style={{ ...base, top: insetY, left: insetX, borderTop: `1px solid ${c}`, borderLeft: `1px solid ${c}` }} />
  if (pos === 'tr')
    return <span aria-hidden style={{ ...base, top: insetY, right: insetXR, borderTop: `1px solid ${c}`, borderRight: `1px solid ${c}` }} />
  if (pos === 'bl')
    return <span aria-hidden style={{ ...base, bottom: insetYB, left: insetX, borderBottom: `1px solid ${c}`, borderLeft: `1px solid ${c}` }} />
  return <span aria-hidden style={{ ...base, bottom: insetYB, right: insetXR, borderBottom: `1px solid ${c}`, borderRight: `1px solid ${c}` }} />
}

/** 起動画面用に大きく・線描アニメ付きで描く kai 波マーク */
export function SplashWaveMark({
  size = 72,
  from = KAI.violet,
  to = KAI.mint,
  animateDelay = 0.1,
  animateDuration = 1.4,
  idPrefix = 'splash-mark',
  glow = false,
}: {
  size?: number
  from?: string
  to?: string
  animateDelay?: number
  animateDuration?: number
  idPrefix?: string
  glow?: boolean
}) {
  const dashLen = 38
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      style={{
        display: 'block',
        filter: glow
          ? `drop-shadow(0 0 18px ${from}55) drop-shadow(0 0 32px ${to}33)`
          : 'none',
        animation: `kai-splash-fade .9s ${animateDelay}s both`,
      }}
    >
      <path
        d="M1 9h2.5l2-4.5 3.5 9 2-4.5H15"
        stroke={`url(#${idPrefix}-grad)`}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={dashLen}
        strokeDashoffset={dashLen}
        style={{
          animation: `kai-splash-draw ${animateDuration}s ${animateDelay}s cubic-bezier(.65,.05,.36,1) forwards`,
        }}
      />
      <defs>
        <linearGradient id={`${idPrefix}-grad`} x1="1" y1="9" x2="15" y2="9" gradientUnits="userSpaceOnUse">
          <stop stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
    </svg>
  )
}
