import type { NormalizedBlock, AmountResult } from './types'

const TOTAL_KWS = [
  '合計', '合　計', 'お支払い合計', 'お支払合計',
  'ご請求額', 'ご請求合計', '税込合計', '税込金額',
  '総合計', 'TOTAL', 'GRAND TOTAL',
]
const SECONDARY_KWS = ['小計', '税込', 'お会計', '精算']
const EXCLUDE_KWS   = ['お預り', 'お釣り', 'おつり', '釣り', '釣銭', 'CHANGE', 'ポイント', 'チャージ', '残高', '割引']

// 返金レシートを示すキーワード
const REFUND_KWS = ['返品', '返金', '取消', 'RETURN', 'REFUND', 'CANCEL', '払戻']

function parseAmount(text: string): number | null {
  // 明示的負数: "-1,280" or "−1,280"
  const negMatch = text.match(/[−\-]\s*[\d,，０-９]+/)
  if (negMatch) {
    const digits = negMatch[0].replace(/[−\-\s,，]/g, '').replace(/[０-９]/g, c => String(c.charCodeAt(0) - 0xFF10))
    const val = parseInt(digits, 10)
    if (!isNaN(val) && val > 0) return -val
  }

  const m = text.match(/[¥￥]?\s*([\d,，０-９]+)\s*円?/)
  if (!m) return null
  const digits = m[1]
    .replace(/[,，]/g, '')
    .replace(/[０-９]/g, c => String(c.charCodeAt(0) - 0xFF10))
  const val = parseInt(digits, 10)
  return isNaN(val) || val <= 0 ? null : val
}

export function extractAmount(blocks: NormalizedBlock[]): AmountResult {
  const filtered = blocks.filter(b => !b.isNoise && !b.isVertical)

  interface Hit { amount: number; priority: number; idx: number }
  const hits: Hit[] = []

  for (let i = 0; i < filtered.length; i++) {
    const text = filtered[i].textNorm
    if (EXCLUDE_KWS.some(kw => text.includes(kw))) continue

    const raw = parseAmount(text)
    if (raw === null) continue

    const absAmt = Math.abs(raw)
    if (absAmt < 10 || absAmt > 1_000_000) continue

    const isTotalKw    = TOTAL_KWS.some(kw => text.includes(kw))
    const isSecondary  = SECONDARY_KWS.some(kw => text.includes(kw))
    const prevText     = i > 0 ? filtered[i - 1].textNorm : ''
    const prevIsTotal  = TOTAL_KWS.some(kw => prevText.includes(kw))
    const prevIsSecond = SECONDARY_KWS.some(kw => prevText.includes(kw))

    let priority = 0
    if (isTotalKw || prevIsTotal)         priority = 3
    else if (isSecondary || prevIsSecond) priority = 1

    hits.push({ amount: absAmt, priority, idx: i })
  }

  if (hits.length === 0) return { amount: 0, confidence: 0 }

  hits.sort((a, b) => b.priority - a.priority || b.idx - a.idx)
  const best = hits[0]
  const confidence = best.priority >= 3 ? 0.90 : best.priority >= 1 ? 0.70 : 0.50

  // ── 返金判定: レシート全文ではなく「合計行の前後3行 or 先頭5行」のみ検索 ──
  // 全文スキャンだと「返金相当ポイント」などが通常レシートで誤検出される。
  const totalIdxs  = hits.filter(h => h.priority >= 3).map(h => h.idx)
  const isRefund   = filtered.some((b, i) => {
    if (!REFUND_KWS.some(kw => b.textNorm.includes(kw))) return false
    const isTopLine  = i < 5
    const nearTotal  = totalIdxs.some(t => Math.abs(t - i) <= 3)
    return isTopLine || nearTotal
  })

  // 返金レシートは正数 (収入), 通常レシートは負数 (支出)
  const amount = isRefund ? best.amount : -best.amount

  return { amount, confidence }
}
