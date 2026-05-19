// lib/kai-tokens.ts
// kai (家計簿管理) Design System — Direction C "Warm Companion"
// 既存の design handoff の値をそのまま TypeScript 化したもの。
//
// 使用例:
//   import { KAI } from '@/lib/kai-tokens'
//   <div style={{ color: KAI.text1, background: KAI.bg }}/>

export const KAI = {
  // ── Surfaces ─────────────────────────────────────────
  bg:        '#0a0a10',                          // primary dark surface
  bgCard:    '#0c0a14',                          // C-direction warm-tinted card bg
  bgPanel:   'rgba(20,22,32,0.66)',
  bgPanelSolid: '#14161f',

  border:    'rgba(255,255,255,0.06)',
  border2:   'rgba(255,255,255,0.10)',
  borderStrong: 'rgba(255,255,255,0.16)',

  // ── Text scale ───────────────────────────────────────
  text1:     '#f0f0f5',                          // primary
  text2:     '#c4c4d0',                          // secondary
  text3:     '#8b8ba0',                          // tertiary
  text4:     '#5e5e72',                          // muted
  text5:     '#3e3e55',                          // faintest

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
