// lib/kai-tokens.ts
// kai (家計簿管理) Design System — Direction C "Warm Companion"
// 既存の design handoff の値をそのまま TypeScript 化したもの。
//
// 使用例:
//   import { KAI } from '@/lib/kai-tokens'
//   <div style={{ color: KAI.text1, background: KAI.bg }}/>

export const KAI = {
  // ── Surfaces (CSS 変数 — テーマ切替で自動更新) ────────
  bg:           'var(--kai-bg)',
  bgCard:       'var(--kai-bg-card)',
  bgPanel:      'var(--kai-bg-panel)',
  bgPanelSolid: 'var(--kai-bg-panel-solid)',

  border:       'var(--kai-border)',
  border2:      'var(--kai-border2)',
  borderStrong: 'var(--kai-border-strong)',

  // ── Text scale (CSS 変数 — テーマ切替で自動更新) ──────
  text1:     'var(--kai-text1)',                 // primary
  text2:     'var(--kai-text2)',                 // secondary
  text3:     'var(--kai-text3)',                 // tertiary
  text4:     'var(--kai-text4)',                 // muted
  text5:     'var(--kai-text5)',                 // faintest

  // ── C-direction accents ──────────────────────────────
  coral:     '#fb9477',                          // PRIMARY accent (warm)
  coralSoft: 'rgba(251,148,119,0.10)',           // translucent coral for backgrounds
  tangerine: '#fb9477',                          // alias used in MF screens
  blue:      '#7aa7ff',                          // SECONDARY accent
  peach:     '#f5d4b8',
  violet:    '#a78bfa',                          // AI / suggestions
  mint:      '#5eead4',
  cyan:      '#22d3ee',

  // ── Semantic ─────────────────────────────────────────
  success:   '#4ade80',
  green:     '#4ade80',
  danger:    '#fb7185',
  warning:   '#fbbf24',
  info:      '#38bdf8',                          // sky-blue — vector / 情報系
  orange:    '#f97316',                          // 強めの警告 / llm_freeform

  // ── Extra category colors ────────────────────────────
  amber:     '#f9b27e',
  mintExtra: '#5eead4',
} as const

export type KaiToken = typeof KAI

/** 円フォーマット ¥1,234 */
export const yen = (n: number): string =>
  '¥' + Math.round(n).toLocaleString('ja-JP')
