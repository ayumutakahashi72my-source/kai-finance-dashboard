import { describe, it, expect } from 'vitest'
import { normalizeOCRBlocks } from '../lib/ocr/normalize'
import { extractAmount } from '../lib/ocr/amount'
import { extractDate } from '../lib/ocr/date'
import { detectMerchant } from '../lib/ocr/merchant'
import { buildFingerprint } from '../lib/ocr/fingerprint'
import type { OCRBlock, NormalizedBlock } from '../lib/ocr/types'

function block(text: string, score = 0.95, x = 0.1, y = 0, w = 0.8, h = 0.02): OCRBlock {
  return { text, score, bbox: { x, y, w, h } }
}

function norm(text: string, lineGroup = 0, score = 0.95): NormalizedBlock {
  return {
    text,
    textNorm: text,
    score,
    bbox: { x: 0.1, y: lineGroup * 0.03, w: 0.8, h: 0.02 },
    lineGroup,
    isVertical: false,
    isNoise: false,
  }
}

// ── normalizeOCRBlocks ───────────────────────────────────────────

describe('normalizeOCRBlocks', () => {
  it('全角英数を半角に変換する', () => {
    const result = normalizeOCRBlocks([block('ＡＥ０Ｎ')])
    expect(result[0].textNorm).toBe('AEON')
  })

  it('OCR typo を修正する (AE0N → AEON)', () => {
    const result = normalizeOCRBlocks([block('AE0N')])
    expect(result[0].textNorm).toBe('AEON')
  })

  it('イオソ → イオン の修正', () => {
    const result = normalizeOCRBlocks([block('イオソ')])
    expect(result[0].textNorm).toBe('イオン')
  })

  it('ノイズブロックを除去する', () => {
    const result = normalizeOCRBlocks([
      block('セブンイレブン'),
      block('ありがとうございました'),
      block('***'),
      block('---'),
    ])
    expect(result.map(b => b.textNorm)).toEqual(['セブンイレブン'])
  })

  it('低スコアブロック(< 0.4)を除去する', () => {
    const result = normalizeOCRBlocks([
      block('セブンイレブン', 0.95),
      block('ノイズ', 0.2),
    ])
    expect(result).toHaveLength(1)
  })

  it('重複ブロックを除去する（同じ行グループ+テキスト）', () => {
    const result = normalizeOCRBlocks([
      block('合計', 0.9, 0.1, 0.1),
      block('合計', 0.85, 0.1, 0.1),
    ])
    expect(result).toHaveLength(1)
  })

  it('縦書きブロックを検出する', () => {
    const result = normalizeOCRBlocks([
      { text: 'テスト', score: 0.9, bbox: { x: 0.1, y: 0, w: 0.02, h: 0.15 } },
    ])
    expect(result[0].isVertical).toBe(true)
  })
})

// ── extractAmount ────────────────────────────────────────────────

describe('extractAmount', () => {
  it('合計キーワード付き金額を最優先で抽出する', () => {
    const blocks = [
      norm('コーヒー ¥500', 0),
      norm('合計 ¥1,280', 1),
      norm('お預り ¥2,000', 2),
    ]
    const result = extractAmount(blocks)
    expect(result.amount).toBe(-1280)
    expect(result.confidence).toBeGreaterThanOrEqual(0.9)
  })

  it('お支払い合計を認識する', () => {
    const result = extractAmount([norm('お支払い合計 ¥3,500', 0)])
    expect(result.amount).toBe(-3500)
  })

  it('小計を二次キーワードとして認識する（ただしAIダブルチェック閾値未満に留める）', () => {
    // 合計行を拾えず小計止まりの場合、税抜/税込の取り違えリスクがあるため
    // confidenceはAIフォールバック閾値(0.60)未満に据え置く。
    const result = extractAmount([norm('小計 ¥980', 0)])
    expect(result.amount).toBe(-980)
    expect(result.confidence).toBe(0.55)
    expect(result.confidence).toBeLessThan(0.60)
  })

  it('お預り・お釣りは除外する', () => {
    const blocks = [
      norm('合計 ¥500', 0),
      norm('お預り ¥1,000', 1),
      norm('お釣り ¥500', 2),
    ]
    const result = extractAmount(blocks)
    expect(result.amount).toBe(-500)
  })

  it('全角数字を処理できる', () => {
    const result = extractAmount([norm('合計 ¥１，２８０', 0)])
    expect(result.amount).toBe(-1280)
  })

  it('ブロックが空の場合は confidence 0', () => {
    const result = extractAmount([])
    expect(result.amount).toBe(0)
    expect(result.confidence).toBe(0)
  })

  it('前行が合計キーワードなら次行の金額を拾う', () => {
    const blocks = [
      norm('合計', 0),
      norm('¥1,500', 1),
    ]
    const result = extractAmount(blocks)
    expect(result.amount).toBe(-1500)
  })

  it('返金レシートは正数になる', () => {
    const blocks = [
      norm('返品', 0),
      norm('合計 ¥800', 1),
    ]
    const result = extractAmount(blocks)
    expect(result.amount).toBe(800)
  })

  it('10,000,000を超える金額は除外する', () => {
    const result = extractAmount([norm('合計 ¥99,999,999', 0)])
    expect(result.amount).toBe(0)
  })
})

// ── extractDate ──────────────────────────────────────────────────

describe('extractDate', () => {
  it('YYYY/MM/DD 形式を抽出する', () => {
    const result = extractDate([norm('2026/06/15', 0)])
    expect(result.date).toBe('2026-06-15')
    expect(result.confidence).toBe(0.9)
  })

  it('YYYY-MM-DD 形式を抽出する', () => {
    const result = extractDate([norm('2026-03-01', 0)])
    expect(result.date).toBe('2026-03-01')
  })

  it('YYYY年MM月DD日 形式を抽出する', () => {
    const result = extractDate([norm('2026年6月15日', 0)])
    expect(result.date).toBe('2026-06-15')
  })

  it('令和の和暦を変換する', () => {
    const result = extractDate([norm('令和8年6月15日', 0)])
    expect(result.date).toBe('2026-06-15')
    expect(result.confidence).toBe(0.95)
  })

  it('令和元年(2019)はvalid範囲外のためフォールバックする', () => {
    const result = extractDate([norm('令和元年5月1日', 0)])
    expect(result.confidence).toBe(0)
  })

  it('短縮形式 YY/MM/DD を処理する', () => {
    const result = extractDate([norm('26/06/15', 0)])
    expect(result.date).toBe('2026-06-15')
  })

  it('日付がない場合はconfidence 0でフォールバック', () => {
    const result = extractDate([norm('コーヒー ¥500', 0)])
    expect(result.confidence).toBe(0)
  })

  it('2020年より前の日付は無視する', () => {
    const result = extractDate([norm('2019/12/31', 0)])
    expect(result.confidence).toBe(0)
  })
})

// ── detectMerchant ───────────────────────────────────────────────

describe('detectMerchant', () => {
  it('先頭のテキストブロックから店名を検出する', () => {
    const blocks = [
      norm('セブンイレブン 渋谷店', 0),
      norm('2026/06/15 12:30', 1),
      norm('コーヒー ¥150', 2),
    ]
    const result = detectMerchant(blocks)
    expect(result.merchant).toBe('セブンイレブン 渋谷店')
    expect(result.confidence).toBeGreaterThan(0)
  })

  it('数字だけのブロックはスキップする', () => {
    const blocks = [
      norm('1234 5678', 0),
      norm('イオン', 1),
    ]
    const result = detectMerchant(blocks)
    expect(result.merchant).toBe('イオン')
  })

  it('電話番号の近くのブロックにボーナスを付ける', () => {
    const blocks: NormalizedBlock[] = [
      { text: '1234', textNorm: '1234', score: 0.95, bbox: { x: 0.1, y: 0, w: 0.8, h: 0.02 }, lineGroup: 0, isVertical: false, isNoise: false },
      { text: 'マツモトキヨシ', textNorm: 'マツモトキヨシ', score: 0.90, bbox: { x: 0.1, y: 0.03, w: 0.6, h: 0.02 }, lineGroup: 1, isVertical: false, isNoise: false },
      { text: 'TEL 03-1234-5678', textNorm: 'TEL 03-1234-5678', score: 0.92, bbox: { x: 0.1, y: 0.06, w: 0.5, h: 0.02 }, lineGroup: 2, isVertical: false, isNoise: false },
    ]
    const result = detectMerchant(blocks)
    expect(result.merchant).toBe('マツモトキヨシ')
  })

  it('空のブロック配列では空文字を返す', () => {
    const result = detectMerchant([])
    expect(result.merchant).toBe('')
    expect(result.confidence).toBe(0)
  })
})

// ── buildFingerprint ─────────────────────────────────────────────

describe('buildFingerprint', () => {
  it('同じ入力で同じ storeKey を生成する', () => {
    const blocks = [norm('イオン', 0), norm('TEL 03-1234-5678', 1)]
    const fp1 = buildFingerprint('イオン', blocks)
    const fp2 = buildFingerprint('イオン', blocks)
    expect(fp1.storeKey).toBe(fp2.storeKey)
  })

  it('異なる店名で異なる storeKey を生成する', () => {
    const blocks = [norm('dummy', 0)]
    const fp1 = buildFingerprint('イオン', blocks)
    const fp2 = buildFingerprint('セブンイレブン', blocks)
    expect(fp1.storeKey).not.toBe(fp2.storeKey)
  })

  it('電話番号を抽出する', () => {
    const blocks = [norm('TEL 03-1234-5678', 0)]
    const fp = buildFingerprint('テスト', blocks)
    expect(fp.phone).toBe('03-1234-5678')
  })

  it('郵便番号を抽出する', () => {
    const blocks = [norm('〒150-0001', 0)]
    const fp = buildFingerprint('テスト', blocks)
    expect(fp.zipcode).toBe('150-0001')
  })

  it('layoutHash を生成する', () => {
    const blocks = [norm('line1', 0), norm('line2', 1)]
    const fp = buildFingerprint('テスト', blocks)
    expect(fp.layoutHash).toBeTruthy()
  })
})

// ── End-to-end: レシートデータのシミュレーション ─────────────────

describe('OCR pipeline integration (heuristic path)', () => {
  it('典型的なコンビニレシートから店名・金額・日付を抽出する', () => {
    const rawBlocks: OCRBlock[] = [
      block('セブンイレブン 渋谷店',      0.95, 0.15, 0.02, 0.7, 0.025),
      block('〒150-0001',                  0.90, 0.15, 0.05, 0.5, 0.02),
      block('TEL 03-3456-7890',            0.92, 0.15, 0.07, 0.5, 0.02),
      block('2026/06/15 12:30',            0.93, 0.15, 0.10, 0.5, 0.02),
      block('コーヒー',                    0.88, 0.10, 0.14, 0.4, 0.02),
      block('¥150',                        0.92, 0.55, 0.14, 0.2, 0.02),
      block('サンドイッチ',                0.90, 0.10, 0.17, 0.4, 0.02),
      block('¥380',                        0.91, 0.55, 0.17, 0.2, 0.02),
      block('合計',                        0.94, 0.10, 0.22, 0.3, 0.025),
      block('¥530',                        0.95, 0.55, 0.22, 0.2, 0.025),
      block('お預り ¥1,000',               0.90, 0.10, 0.26, 0.6, 0.02),
      block('お釣り ¥470',                 0.90, 0.10, 0.29, 0.6, 0.02),
    ]

    const normalized = normalizeOCRBlocks(rawBlocks)
    const merchant = detectMerchant(normalized)
    const amount = extractAmount(normalized)
    const date = extractDate(normalized)
    const fp = buildFingerprint(merchant.merchant, normalized)

    expect(merchant.merchant).toContain('セブンイレブン')
    expect(merchant.confidence).toBeGreaterThan(0.5)

    expect(amount.amount).toBe(-530)
    expect(amount.confidence).toBeGreaterThanOrEqual(0.9)

    expect(date.date).toBe('2026-06-15')
    expect(date.confidence).toBeGreaterThanOrEqual(0.9)

    expect(fp.phone).toBe('03-3456-7890')
    expect(fp.zipcode).toBe('150-0001')
    expect(fp.storeKey).toBeTruthy()
  })

  it('スーパーの税込合計レシートを処理する', () => {
    const rawBlocks: OCRBlock[] = [
      block('イオン 新宿店',        0.93, 0.15, 0.02, 0.7, 0.025),
      block('2026年3月10日',         0.91, 0.15, 0.05, 0.5, 0.02),
      block('牛乳 ¥198',            0.89, 0.10, 0.10, 0.6, 0.02),
      block('パン ¥128',            0.90, 0.10, 0.13, 0.6, 0.02),
      block('税込合計 ¥326',        0.94, 0.10, 0.18, 0.7, 0.025),
    ]

    const normalized = normalizeOCRBlocks(rawBlocks)
    const amount = extractAmount(normalized)
    const date = extractDate(normalized)

    expect(amount.amount).toBe(-326)
    expect(date.date).toBe('2026-03-10')
  })

  it('和暦表記のレシートを処理する', () => {
    const rawBlocks: OCRBlock[] = [
      block('ローソン',               0.94, 0.15, 0.02, 0.7, 0.025),
      block('令和8年6月20日',          0.92, 0.15, 0.05, 0.5, 0.02),
      block('合計 ¥256',              0.95, 0.10, 0.10, 0.6, 0.025),
    ]

    const normalized = normalizeOCRBlocks(rawBlocks)
    const date = extractDate(normalized)

    expect(date.date).toBe('2026-06-20')
    expect(date.confidence).toBe(0.95)
  })

  it('返金レシートを正しく処理する', () => {
    const rawBlocks: OCRBlock[] = [
      block('返品レシート',      0.93, 0.15, 0.02, 0.7, 0.025),
      block('イオン',            0.94, 0.15, 0.05, 0.5, 0.02),
      block('合計 ¥1,500',       0.95, 0.10, 0.10, 0.6, 0.025),
    ]

    const normalized = normalizeOCRBlocks(rawBlocks)
    const amount = extractAmount(normalized)

    expect(amount.amount).toBe(1500)
  })

  it('金額がないレシートでは confidence 0 を返す', () => {
    const rawBlocks: OCRBlock[] = [
      block('セブンイレブン', 0.93, 0.15, 0.02, 0.7, 0.025),
      block('ありがとうございました', 0.90, 0.15, 0.05, 0.5, 0.02),
    ]

    const normalized = normalizeOCRBlocks(rawBlocks)
    const amount = extractAmount(normalized)

    expect(amount.amount).toBe(0)
    expect(amount.confidence).toBe(0)
  })
})
