import type { NormalizedBlock } from './types'

function hash32(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0
  return h.toString(36)
}

export interface FingerprintResult {
  storeKey: string
  layoutHash: string
  phone?: string
  zipcode?: string
}

export function buildFingerprint(
  normalizedMerchant: string,
  blocks: NormalizedBlock[],
): FingerprintResult {
  // ── Address signals ────────────────────────────────────────────
  const phoneBlock = blocks.find(b => /\d{2,4}[-－]\d{3,4}[-－]\d{4}/.test(b.textNorm))
  const phoneMatch = phoneBlock?.textNorm.match(/(\d{2,4})[-－](\d{3,4})[-－](\d{4})/)
  const phone      = phoneMatch ? phoneMatch[0] : undefined
  const phoneSuffix = phoneMatch ? phoneMatch[3] : ''

  const zipBlock = blocks.find(b => /〒?\d{3}[-－]\d{4}/.test(b.textNorm))
  const zipMatch = zipBlock?.textNorm.match(/(\d{3})[-－](\d{4})/)
  const zipcode  = zipMatch ? `${zipMatch[1]}-${zipMatch[2]}` : undefined

  // Store key: hash of normalized merchant + address signals (OCR-error resistant)
  const storeKey = hash32(
    [normalizedMerchant.toLowerCase().replace(/\s+/g, ''), phoneSuffix, zipcode ?? ''].join(':')
  ).slice(0, 16)

  // ── Layout hash: geometry only, no OCR text ────────────────────
  const lineCount   = blocks.length
  const lineGroups  = new Set(blocks.map(b => b.lineGroup)).size
  const telPos      = blocks.findIndex(b => /TEL|電話/.test(b.textNorm))
  const taxPos      = blocks.findIndex(b => /消費税|内税|外税/.test(b.textNorm))
  const wideCount   = blocks.filter(b => b.bbox.w > 0.5).length
  const avgWidthQ   = Math.round((blocks.reduce((s, b) => s + b.bbox.w, 0) / (blocks.length || 1)) * 10)
  const ySpread     = blocks.length
    ? Math.round((Math.max(...blocks.map(b => b.bbox.y + b.bbox.h)) - Math.min(...blocks.map(b => b.bbox.y))) * 10)
    : 0

  const layoutHash = hash32([lineCount, lineGroups, telPos, taxPos, wideCount, avgWidthQ, ySpread].join(':'))

  return { storeKey, layoutHash, phone, zipcode }
}
