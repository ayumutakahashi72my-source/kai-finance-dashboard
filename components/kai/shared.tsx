// components/kai/shared.tsx
// kai 共通プリミティブ — design handoff の `kai-shared.jsx` を TypeScript 化。
//
// Server Component からも import 可能なように "use client" は付けない。
// （SVG / div だけなので副作用なし）
//
// 提供するもの:
//   - MONO_STYLE          : JetBrains Mono + tabular 数字
//   - Icon                : Lucide 風 24px 線アイコン
//   - KaiLogo             : kai のロゴマーク（グラデ stroke）
//   - CAvatar             : 角丸スクエアのユーザーアバター
//   - PhoneShell          : デザインプレビュー用のスマホフレーム

import * as React from 'react'
import { KAI } from '@/lib/kai-tokens'

// ──────────────────────────────────────────────────────────────────
// Mono style
// ──────────────────────────────────────────────────────────────────

export const MONO_STYLE: React.CSSProperties = {
  fontFamily: 'var(--font-jetbrains), "JetBrains Mono", monospace',
  fontFeatureSettings: '"tnum" 1',
}

// ──────────────────────────────────────────────────────────────────
// Icon — single-color line icon (Lucide-like)
// ──────────────────────────────────────────────────────────────────

export type IconName =
  | 'grid' | 'chart' | 'calendar' | 'sparkle' | 'plus' | 'bell'
  | 'link' | 'pie' | 'msg' | 'arrow' | 'arrowUp' | 'arrowDown' | 'arrowRight'
  | 'refresh' | 'tag' | 'search' | 'settings' | 'coffee' | 'cart'
  | 'home' | 'user' | 'check' | 'train' | 'bag' | 'bank' | 'lock' | 'camera'

interface IconProps {
  name: IconName
  size?: number
  stroke?: number
}

export function Icon({ name, size = 18, stroke = 1.8 }: IconProps) {
  const paths: Record<IconName, React.ReactNode> = {
    grid:     (<g><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></g>),
    chart:    (<g><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></g>),
    calendar: (<g><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></g>),
    sparkle:  (<g><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="M19 14l.6 1.8L21.4 16.4l-1.8.6L19 18.8l-.6-1.8L16.6 16.4l1.8-.6z"/></g>),
    plus:     (<g><path d="M12 5v14M5 12h14"/></g>),
    bell:     (<g><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></g>),
    link:     (<g><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></g>),
    pie:      (<g><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></g>),
    msg:      (<g><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></g>),
    arrow:    (<g><path d="M5 12h14M13 6l6 6-6 6"/></g>),
    arrowUp:  (<g><path d="M12 19V5M5 12l7-7 7 7"/></g>),
    arrowDown:(<g><path d="M12 5v14M5 12l7 7 7-7"/></g>),
    arrowRight:(<g><path d="M5 12h14M13 5l7 7-7 7"/></g>),
    refresh:  (<g><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></g>),
    tag:      (<g><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1"/></g>),
    search:   (<g><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></g>),
    settings: (<g><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></g>),
    coffee:   (<g><path d="M17 8h1a4 4 0 0 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z"/><path d="M6 2v3M10 2v3M14 2v3"/></g>),
    cart:     (<g><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></g>),
    home:     (<g><path d="M3 12L12 3l9 9"/><path d="M5 10v10h14V10"/></g>),
    user:     (<g><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></g>),
    check:    (<g><path d="M20 6L9 17l-5-5"/></g>),
    train:    (<g><rect x="4" y="3" width="16" height="16" rx="4"/><circle cx="9" cy="14" r="1"/><circle cx="15" cy="14" r="1"/><path d="M8 19l-2 2M16 19l2 2"/></g>),
    bag:      (<g><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/></g>),
    bank:     (<g><path d="M3 21h18"/><path d="M5 21V9l7-5 7 5v12"/><path d="M9 21v-7M15 21v-7M12 21v-7"/></g>),
    lock:     (<g><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></g>),
    camera:   (<g><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/></g>),
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? <circle cx="12" cy="12" r="6"/>}
    </svg>
  )
}

// ──────────────────────────────────────────────────────────────────
// KaiLogo — gradient stroke mark
// ──────────────────────────────────────────────────────────────────

interface KaiLogoProps {
  size?: number
  gradientId?: string
}

export function KaiLogo({ size = 16, gradientId = 'klg' }: KaiLogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M1 9h2.5l2-4.5 3.5 9 2-4.5H15"
        stroke={`url(#${gradientId})`}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id={gradientId} x1="1" y1="9" x2="15" y2="9" gradientUnits="userSpaceOnUse">
          <stop stopColor={KAI.violet}/>
          <stop offset="1" stopColor={KAI.mint}/>
        </linearGradient>
      </defs>
    </svg>
  )
}

// ──────────────────────────────────────────────────────────────────
// CAvatar — rounded-square user avatar (top-right)
// ──────────────────────────────────────────────────────────────────

interface CAvatarProps {
  size?: number
  initial?: string
}

export function CAvatar({ size = 32, initial = 'あ' }: CAvatarProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        background: `linear-gradient(135deg, ${KAI.coral}, ${KAI.blue})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.42,
        fontWeight: 700,
        color: KAI.bg,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,.4), 0 4px 10px ${KAI.coral}33`,
        letterSpacing: '-.02em',
        flexShrink: 0,
      }}
    >
      {initial}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// KaiSystemBrand — left-top brand badge (システム ID 風)
// ──────────────────────────────────────────────────────────────────

interface KaiSystemBrandProps {
  size?: 'sm' | 'md' | 'lg'
}

export function KaiSystemBrand({ size = 'sm' }: KaiSystemBrandProps) {
  const av = size === 'lg' ? 42 : size === 'md' ? 38 : 34
  const titleSize = size === 'lg' ? 18 : size === 'md' ? 16 : 15
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size === 'lg' ? 14 : 11 }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          padding: 1.2,
          borderRadius: 12,
          background: 'linear-gradient(135deg, rgba(251,148,119,.65), rgba(122,167,255,.65))',
        }}>
          <div style={{
            width: av,
            height: av,
            borderRadius: 11,
            background: '#0c0a14',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '42%',
              background: 'linear-gradient(180deg, rgba(255,255,255,.07), transparent)',
            }} />
            <KaiLogo size={Math.round(av * 0.46)} gradientId={`c-brand-${size}`} />
            <span aria-hidden style={{ position: 'absolute', top: 3, left: 3, width: 4, height: 4, borderTop: `1px solid ${KAI.coral}99`, borderLeft: `1px solid ${KAI.coral}99` }} />
            <span aria-hidden style={{ position: 'absolute', bottom: 3, right: 3, width: 4, height: 4, borderBottom: `1px solid ${KAI.blue}99`, borderRight: `1px solid ${KAI.blue}99` }} />
          </div>
        </div>
        <span style={{
          position: 'absolute', top: -2, right: -2,
          width: 9, height: 9, borderRadius: '50%',
          background: '#4ade80', border: '2px solid #0c0a14',
          boxShadow: '0 0 6px rgba(74,222,128,.7)',
          animation: 'kai-pulse-mint 2.4s ease-in-out infinite',
          display: 'block',
        }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: titleSize, fontWeight: 700, color: '#f0f0f5', letterSpacing: '-.02em', lineHeight: 1 }}>kai</span>
          <span style={{
            fontSize: 8,
            fontFamily: 'var(--font-jetbrains), JetBrains Mono, monospace',
            color: '#8b8ba0',
            fontWeight: 700,
            letterSpacing: '.14em',
            padding: '1px 5px',
            background: 'rgba(255,255,255,.04)',
            border: '1px solid rgba(255,255,255,.10)',
            borderRadius: 4,
          }}>v2.4</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, fontFamily: 'var(--font-jetbrains), JetBrains Mono, monospace', letterSpacing: '.14em', fontWeight: 700, marginTop: 2 }}>
          <span style={{ color: KAI.coral }}>家計簿管理</span>
          <span style={{ color: '#3e3e55' }}>/</span>
          <span style={{ color: '#8b8ba0' }}>HH-072</span>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// Ring — Apple Watch 風リングチャート
// ──────────────────────────────────────────────────────────────────

interface RingProps {
  percent?: number
  size?: number
  stroke?: number
  color?: string
  track?: string
  /** アニメーション開始遅延 (ms) */
  delayMs?: number
}

export function Ring({
  percent = 65,
  size = 160,
  stroke = 14,
  color = KAI.coral,
  track = 'rgba(255,255,255,.07)',
  delayMs = 200,
}: RingProps) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const target = c - (c * percent) / 100
  return (
    <svg width={size} height={size} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`ring-grad-${size}-${color.replace('#', '')}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity={0.6} />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={`url(#ring-grad-${size}-${color.replace('#', '')})`}
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        strokeDasharray={c}
        strokeDashoffset={target}
        style={{
          // @ts-expect-error CSS custom property
          '--ring-target': target,
          animation: `kai-ring-draw 1.4s ${delayMs / 1000}s cubic-bezier(.2,.8,.3,1) both`,
        }}
      />
    </svg>
  )
}

// ──────────────────────────────────────────────────────────────────
// PhoneShell — visual phone frame for design previews
// （実プロダクションのページからは使わない。デザイン確認用。）
// ──────────────────────────────────────────────────────────────────

interface PhoneShellProps {
  children: React.ReactNode
  width?: number
  height?: number
  bg?: string
  glow?: 'mint' | 'edge' | 'warm' | 'none'
  radius?: number
}

export function PhoneShell({
  children,
  width = 390,
  height = 780,
  bg = KAI.bg,
  glow = 'mint',
  radius = 44,
}: PhoneShellProps) {
  const glowMap: Record<string, string> = {
    mint: 'radial-gradient(ellipse 320px 220px at 80% 8%, rgba(167,139,250,.10), transparent 55%), radial-gradient(ellipse 280px 180px at 12% 78%, rgba(94,234,212,.07), transparent 55%)',
    edge: 'radial-gradient(ellipse 360px 200px at 50% 0%, rgba(94,234,212,.06), transparent 60%)',
    warm: 'radial-gradient(ellipse 320px 220px at 80% 8%, rgba(251,148,119,.12), transparent 55%), radial-gradient(ellipse 280px 180px at 12% 78%, rgba(122,167,255,.07), transparent 55%)',
    none: 'none',
  }
  return (
    <div
      style={{
        width,
        height,
        background: bg,
        borderRadius: radius,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,.10)',
        boxShadow: '0 20px 60px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,.04)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--font-sans), Inter, sans-serif',
        color: KAI.text1,
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          background: glowMap[glow] ?? glowMap.mint,
        }}
      />
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        {children}
      </div>
    </div>
  )
}
