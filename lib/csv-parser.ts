import Papa from 'papaparse'

export interface ParsedRow {
  occurred_on: string   // YYYY-MM-DD
  payee: string
  amount: number        // 正=収入, 負=支出
  category_hint: string // 大項目 / 中項目
  raw_id: string        // MF の ID フィールド（ハッシュ生成用）
}

export interface CsvParseResult {
  rows: ParsedRow[]
  errors: string[]
}

/**
 * MF CSV は Shift-JIS で書き出されることが多い。
 * UTF-8 (BOM 付き含む) → Shift-JIS の順で試し、日本語ヘッダーが読めた方を返す。
 */
export function decodeCsvBuffer(buffer: ArrayBuffer): string {
  const tryDecode = (enc: string): string | null => {
    try {
      const text = new TextDecoder(enc).decode(buffer).replace(/^﻿/, '')
      if (text.includes('日付') && text.includes('内容')) return text
      return null
    } catch {
      return null
    }
  }
  return tryDecode('utf-8') ?? tryDecode('shift-jis') ?? tryDecode('euc-jp') ??
    new TextDecoder('utf-8').decode(buffer).replace(/^﻿/, '')
}

// MoneyForward Me CSV ヘッダー:
// 日付,内容,金額（円）,保有金融機関,大項目,中項目,メモ,振替,ID
export function parseMfCsv(csvText: string): CsvParseResult {
  const errors: string[] = []
  const rows: ParsedRow[] = []

  // BOM除去 + CRLF正規化
  const text = csvText.replace(/^﻿/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // MF CSV はメタ行（空行・タイトル行）が先頭に入る場合がある。
  // 「日付」を含む行を実際のヘッダー行として探す。
  const lines = text.split('\n')
  const headerLineIdx = lines.findIndex((l) => /^"?日付"?[,\t]/.test(l))
  const csvBody = headerLineIdx > 0 ? lines.slice(headerLineIdx).join('\n') : text

  const result = Papa.parse<Record<string, string>>(csvBody, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().replace(/^"(.*)"$/, '$1'),
  })

  for (const err of result.errors) {
    errors.push(`行 ${(err.row ?? 0) + 2}: ${err.message}`)
  }

  // ヘッダー名の表記ゆれに対応（全角括弧・半角括弧・スペース差異）
  const findCol = (row: Record<string, string>, ...candidates: string[]): string | undefined => {
    for (const c of candidates) {
      const v = row[c]
      if (v !== undefined) return v
    }
    // 前方一致フォールバック
    const key = Object.keys(row).find((k) => candidates.some((c) => k.startsWith(c.slice(0, 2))))
    return key ? row[key] : undefined
  }

  result.data.forEach((row, i) => {
    const rawTransfer = findCol(row, '振替')
    // 振替行はスキップ（MF CSVは "1" または "TRUE" で表現される）
    const transfer = rawTransfer?.trim()
    if (transfer === '1' || transfer?.toUpperCase() === 'TRUE') return

    // 計算対象=0 の行もスキップ（MFが集計から除外している行）
    const calcTarget = findCol(row, '計算対象')
    if (calcTarget?.trim() === '0') return

    const rawDate = findCol(row, '日付')?.trim()
    const rawAmount = findCol(row, '金額（円）', '金額(円)', '金額')?.trim().replace(/,/g, '')
    const rawPayee = findCol(row, '内容')?.trim()
    const rawId = findCol(row, 'ID')?.trim() ?? ''

    if (!rawDate || !rawAmount || !rawPayee) {
      errors.push(`${i + 2}行目: 必須フィールド（日付/内容/金額）が空です`)
      return
    }

    // 2026/05/01 → 2026-05-01
    const m = rawDate.match(/^(\d{4})\/(\d{2})\/(\d{2})$/)
    if (!m) {
      errors.push(`${i + 2}行目: 日付形式が不正です（${rawDate}）`)
      return
    }
    const occurred_on = `${m[1]}-${m[2]}-${m[3]}`

    const amount = parseInt(rawAmount, 10)
    if (isNaN(amount)) {
      errors.push(`${i + 2}行目: 金額が不正です（${rawAmount}）`)
      return
    }

    const category_hint = [
      findCol(row, '大項目'),
      findCol(row, '中項目'),
    ].filter(Boolean).join(' / ')

    rows.push({ occurred_on, payee: rawPayee, amount, category_hint, raw_id: rawId })
  })

  return { rows, errors }
}

export function buildSourceHash(raw_id: string, occurred_on: string, amount: number, payee: string): string {
  const data = `${raw_id}|${occurred_on}|${amount}|${payee}`
  let hash = 5381
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) + hash) ^ data.charCodeAt(i)
    hash = hash >>> 0
  }
  return hash.toString(16).padStart(8, '0') + '_' + data.length.toString(16)
}
