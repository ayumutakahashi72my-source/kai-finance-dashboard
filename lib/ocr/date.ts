import type { NormalizedBlock, DateResult } from './types'
import { todayJST } from './jst'

// 和暦元号 → 西暦変換（元年 = 1年として計算）
const WAREKI: Record<string, number> = {
  '令和': 2018,  // 令和1年 = 2019年
  '平成': 1988,  // 平成1年 = 1989年
  '昭和': 1925,  // 昭和1年 = 1926年
}

function parseWareki(text: string): { y: number; m: number; d: number } | null {
  for (const [era, base] of Object.entries(WAREKI)) {
    const m = text.match(new RegExp(`${era}(\\d{1,2})年(\\d{1,2})月(\\d{1,2})日?`))
    if (m) return { y: base + parseInt(m[1], 10), m: parseInt(m[2], 10), d: parseInt(m[3], 10) }
  }
  return null
}

function parseGregorian(text: string): { y: number; m: number; d: number } | null {
  const m1 = text.match(/(\d{4})[\/\-年](\d{1,2})[\/\-月](\d{1,2})/)
  if (m1) return { y: +m1[1], m: +m1[2], d: +m1[3] }

  const m2 = text.match(/(\d{2})\/(\d{2})\/(\d{2})/)
  if (m2) return { y: 2000 + +m2[1], m: +m2[2], d: +m2[3] }

  return null
}

function valid(y: number, m: number, d: number): boolean {
  return y >= 2020 && y <= 2035 && m >= 1 && m <= 12 && d >= 1 && d <= 31
}

function fmt(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export function extractDate(blocks: NormalizedBlock[]): DateResult {
  for (const b of blocks) {
    if (b.isNoise) continue

    const w = parseWareki(b.textNorm)
    if (w && valid(w.y, w.m, w.d)) return { date: fmt(w.y, w.m, w.d), confidence: 0.95 }

    const g = parseGregorian(b.textNorm)
    if (g && valid(g.y, g.m, g.d)) return { date: fmt(g.y, g.m, g.d), confidence: 0.90 }
  }

  // fallback: 今日の JST 日付
  return { date: todayJST(), confidence: 0 }
}
