import type { NormalizedBlock, MerchantResult } from './types'
import rawChains from './chains.json'

// Load chain map from JSON — add entries to chains.json, not here
const CHAIN_MAP: { pattern: RegExp; canonical: string }[] = rawChains.map(c => ({
  pattern: new RegExp(c.pattern, 'i'),
  canonical: c.canonical,
}))

const SKIP_PATTERNS = [
  /^[\d\s¥￥\-+,\.]+$/,
  /^[A-Z]{1,3}$/,
  /会員|ポイント|レシート|領収|お買/,
  /^\d{4}[-\/]\d{2}/,
  /^TEL|電話|〒/,
  /消費税|内税|外税|税率/,
  /返品|返金|RETURN/,
]

const PROXIMITY = 5

export function detectMerchant(blocks: NormalizedBlock[]): MerchantResult {
  const filtered = blocks.filter(b => !b.isNoise && !b.isVertical)

  const telIdx     = filtered.findIndex(b => /TEL|電話|℡|\d{2,4}[-－]\d{3,4}[-－]\d{4}/.test(b.textNorm))
  const zipIdx     = filtered.findIndex(b => /〒|\d{3}[-－]\d{4}/.test(b.textNorm))
  const invoiceIdx = filtered.findIndex(b => /適格|登録番号|T\d{13}/.test(b.textNorm))

  interface Candidate { block: NormalizedBlock; score: number }
  const candidates: Candidate[] = []

  const top = filtered.slice(0, Math.min(10, filtered.length))

  for (let i = 0; i < top.length; i++) {
    const b = top[i]
    if (SKIP_PATTERNS.some(p => p.test(b.textNorm))) continue
    if (b.textNorm.length < 2 || b.textNorm.length > 40) continue

    let score = b.score

    score += (1 - i / top.length) * 0.3
    if (b.score >= 0.9) score += 0.1
    if (b.bbox.w > 0.5) score += 0.15
    if (Math.abs(b.bbox.x + b.bbox.w / 2 - 0.5) < 0.15) score += 0.1
    if (telIdx >= 0     && Math.abs(i - telIdx) <= PROXIMITY)     score += 0.2
    if (zipIdx >= 0     && Math.abs(i - zipIdx) <= PROXIMITY)     score += 0.15
    if (invoiceIdx >= 0 && Math.abs(i - invoiceIdx) <= PROXIMITY) score += 0.1

    candidates.push({ block: b, score })
  }

  if (candidates.length === 0) return { merchant: '', canonicalChain: '', confidence: 0 }

  candidates.sort((a, b) => b.score - a.score)

  const best = candidates[0]
  const merchant = best.block.textNorm
  const canonicalChain = resolveChain(merchant)
  const confidence = Math.min(0.95, best.score)

  return { merchant, canonicalChain, confidence }
}

export function resolveChain(merchant: string): string {
  for (const { pattern, canonical } of CHAIN_MAP) {
    if (pattern.test(merchant)) return canonical
  }
  return merchant
    .replace(/\d+号?店$/, '')
    .replace(/(店|支店|営業所|センター|ショップ)$/, '')
    .trim()
}
