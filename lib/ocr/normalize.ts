import type { OCRBlock, NormalizedBlock } from './types'

function toHalfWidth(s: string): string {
  return s
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/　/g, ' ')
}

const TYPO_MAP: [RegExp, string][] = [
  [/AE0N/gi,        'AEON'],
  [/イオソ/g,       'イオン'],
  [/SEIY0/gi,       'SEIYU'],
  [/LAWSO[NM]/gi,   'LAWSON'],
  [/FamilylMart/gi, 'FamilyMart'],
  [/7-ELEVEn/gi,   '7-ELEVEN'],
]

const NOISE_PATTERNS = [
  /WELCOME/i,
  /THANK\s*YOU/i,
  /またお越し/,
  /ありがとうございました/,
  /いらっしゃいませ/,
  /^\*+$/,
  /^-{3,}$/,
  /^={3,}$/,
  /^[#＃*＊]+$/,
  /^[=＝]+$/,
  /^[─━=＝]{2,}$/,
]

const LINE_THRESHOLD = 0.018 // 1.8% of image height per line group

function assignLineGroups(blocks: OCRBlock[]): number[] {
  const indexed = blocks.map((b, i) => ({ i, cy: b.bbox.y + b.bbox.h / 2 }))
    .sort((a, b) => a.cy - b.cy)

  const groups = new Array<number>(blocks.length).fill(-1)
  let group = 0
  let prevCy = -1

  for (const { i, cy } of indexed) {
    if (prevCy < 0 || cy - prevCy > LINE_THRESHOLD) group++
    groups[i] = group
    prevCy = cy
  }

  return groups
}

export function normalizeOCRBlocks(blocks: OCRBlock[]): NormalizedBlock[] {
  const lineGroups = assignLineGroups(blocks)
  const seen = new Set<string>()

  return blocks
    .map((block, i) => {
      let textNorm = block.text.normalize('NFKC')
      textNorm = toHalfWidth(textNorm)
      for (const [pat, rep] of TYPO_MAP) {
        textNorm = textNorm.replace(pat, rep)
      }
      textNorm = textNorm.trim()

      const { w, h } = block.bbox
      const isVertical = h > w * 2.5
      const isNoise = NOISE_PATTERNS.some(p => p.test(textNorm)) || block.score < 0.4

      return { ...block, textNorm, lineGroup: lineGroups[i], isVertical, isNoise }
    })
    .filter(b => {
      if (!b.textNorm || b.isNoise) return false
      const key = `${b.lineGroup}:${b.textNorm}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}
