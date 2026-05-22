import * as path from 'path'
import * as fs from 'fs'
import sharp from 'sharp'
import { PaddleOcrService } from 'paddleocr'
import * as ort from 'onnxruntime-node'
import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeKeyword } from '@/lib/ai-classifier'
import { retryWithBackoff } from '@/lib/retry'
import { z } from 'zod'

// ── Types ─────────────────────────────────────────────────────────
export interface OcrResult {
  payee: string
  amount: number
  occurred_on: string
  confidence: number
}

interface StoreHints {
  totalKeyword?: string
  datePattern?: string
  totalIsLast?: boolean
}

// ── Schemas ───────────────────────────────────────────────────────
export const OcrResultSchema = z.object({
  payee:       z.string().max(100).default(''),
  amount:      z.number().default(0),
  occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(() => new Date().toISOString().split('T')[0]),
  confidence:  z.number().min(0).max(1).default(0),
})

const HaikuResponseSchema = z.object({
  payee:       z.string().max(100),
  amount:      z.number(),
  // ゼロ埋めなし ("2026-5-3") も受け入れて正規化する
  occurred_on: z.string()
    .regex(/^\d{4}-\d{1,2}-\d{1,2}$/)
    .transform(s => {
      const [y, m, d] = s.split('-')
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }),
  confidence:  z.number().min(0).max(1),
  hints:       z.object({
    totalKeyword: z.string().optional(),
    datePattern:  z.string().optional(),
    totalIsLast:  z.boolean().optional(),
  }).passthrough().optional(),
})

// ── PP-OCRv3 engine cache (module-scope for Fluid Compute reuse) ──
type OcrService = Awaited<ReturnType<typeof PaddleOcrService.createInstance>>
let _ocrService: OcrService | null = null
let _ocrInitPromise: Promise<OcrService> | null = null

async function getOcrService(): Promise<OcrService> {
  if (_ocrService) return _ocrService
  if (_ocrInitPromise) return _ocrInitPromise

  _ocrInitPromise = (async () => {
    try {
      const modelsDir = path.join(process.cwd(), 'public', 'models')
      const detPath = path.join(modelsDir, 'PP-OCRv5_mobile_det_infer.onnx')
      const recPath = path.join(modelsDir, 'PP-OCRv5_mobile_rec_infer.onnx')
      const dictPath = path.join(modelsDir, 'ppocrv5_dict.txt')

      if (!fs.existsSync(detPath) || !fs.existsSync(recPath)) {
        throw new Error('OCRモデルが見つかりません。npx tsx scripts/download-ocr-models.ts を実行してください。')
      }

      const detBuf = fs.readFileSync(detPath)
      const recBuf = fs.readFileSync(recPath)
      const dictLines = fs.existsSync(dictPath)
        ? fs.readFileSync(dictPath, 'utf8').split('\n').filter(Boolean)
        : []

      const service = await PaddleOcrService.createInstance({
        ort,
        detection: {
          modelBuffer: detBuf.buffer.slice(detBuf.byteOffset, detBuf.byteOffset + detBuf.byteLength) as ArrayBuffer,
          minimumAreaThreshold: 20,
          textPixelThreshold: 0.5,
          paddingBoxVertical: 0.4,
          paddingBoxHorizontal: 0.6,
        },
        recognition: {
          modelBuffer: recBuf.buffer.slice(recBuf.byteOffset, recBuf.byteOffset + recBuf.byteLength) as ArrayBuffer,
          charactersDictionary: dictLines,
          imageHeight: 48,
        },
      })

      _ocrService = service
      return service
    } catch (err) {
      // 初期化失敗時はキャッシュをリセット → 次のリクエストで再試行できる
      _ocrInitPromise = null
      throw err
    }
  })()

  return _ocrInitPromise
}

// ── Image → RGBA pixel data (sharp preprocessing) ─────────────────
async function toImageData(buf: Buffer) {
  const { data, info } = await sharp(buf)
    .normalize()
    .sharpen({ sigma: 1.5 })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .toBuffer({ resolveWithObject: true })

  return {
    data: new Uint8Array(data),
    width: info.width,
    height: info.height,
  }
}

// ── PP-OCRv3 OCR ──────────────────────────────────────────────────
export async function extractReceiptText(buf: Buffer): Promise<string> {
  const service = await getOcrService()
  const imageData = await toImageData(buf)

  const recResults = await service.recognize(imageData, {
    ordering: { sortByReadingOrder: true, sameLineThresholdRatio: 0.25 },
  })

  return service.processRecognition(recResults).text
}

// ── Long-receipt compression ──────────────────────────────────────
function extractKeyLines(rawText: string): string {
  const lines = rawText.split('\n').filter(l => l.trim().length > 0)
  if (lines.length <= 20) return rawText

  const totalPat = /合計|お会計|お支払い|ご請求|TOTAL|total|小計/
  const datePat  = /\d{4}[/\-年]\d{1,2}[/\-月]\d{1,2}/

  const keep = new Set<number>()
  for (let i = 0; i < Math.min(5, lines.length); i++) keep.add(i)
  for (let i = Math.max(0, lines.length - 12); i < lines.length; i++) keep.add(i)
  lines.forEach((l, i) => { if (totalPat.test(l) || datePat.test(l)) keep.add(i) })

  return [...keep].sort((a, b) => a - b).map(i => lines[i]).join('\n')
}

// ── Layer 1: Rule-based extraction ────────────────────────────────
function extractByRules(text: string, hints?: StoreHints): Partial<OcrResult> {
  const result: Partial<OcrResult> = {}
  const lines = text.split('\n')

  // Amount: last matching total line before お釣り/おつり/CHANGE
  const hintKw = hints?.totalKeyword
  const totalKws = hintKw
    ? [hintKw, '合計', '合　計', 'お会計', 'お支払い合計', 'ご請求額', 'TOTAL']
    : ['合計', '合　計', 'お会計', 'お支払い合計', 'ご請求額', 'TOTAL']
  const totalPat = new RegExp(totalKws.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'))
  const excludePat = /おつり|お釣り|CHANGE|返金|預り|釣銭/
  const amtPat = /[¥￥]?\s*([\d,，０-９]+)\s*円?/

  let lastTotalLine = ''
  for (const line of lines) {
    if (totalPat.test(line) && !excludePat.test(line)) lastTotalLine = line
  }
  if (lastTotalLine) {
    const m = lastTotalLine.match(amtPat)
    if (m) {
      const digits = m[1].replace(/[,，]/g, '').replace(/[０-９]/g, (c) => String(c.charCodeAt(0) - 0xFF10))
      const val = parseInt(digits, 10)
      if (!isNaN(val) && val > 0) result.amount = -val
    }
  }

  // Date: multiple formats
  for (const line of lines) {
    const m = line.match(/(\d{4})[/\-年](\d{1,2})[/\-月](\d{1,2})/)
    if (m) {
      const [, y, mo, d] = m.map(Number)
      if (y >= 2020 && y <= 2035 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
        result.occurred_on = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        break
      }
    }
  }

  // Payee: first line with reasonable length
  for (const line of lines) {
    const clean = line.trim().replace(/\s+/g, ' ')
    if (clean.length >= 2 && clean.length <= 40 && !/^[\d\s¥￥\-+]+$/.test(clean)) {
      result.payee = clean
      break
    }
  }

  return result
}

// ── Layer 2: Store cache lookup ───────────────────────────────────
async function lookupStoreCache(
  storeKey: string,
  householdId: string,
  supabase: SupabaseClient,
): Promise<{ payee: string; hints: StoreHints; confidence: number } | null> {
  const { data } = await supabase
    .from('ocr_store_cache')
    .select('payee, hints, confidence, hit_count')
    .eq('household_id', householdId)
    .eq('store_key', storeKey)
    .single()

  if (!data) return null

  await supabase
    .from('ocr_store_cache')
    .update({ hit_count: (data.hit_count as number) + 1, last_seen: new Date().toISOString().split('T')[0] })
    .eq('household_id', householdId)
    .eq('store_key', storeKey)

  return { payee: data.payee as string, hints: (data.hints ?? {}) as StoreHints, confidence: data.confidence as number }
}

// ── Layer 3: Claude Haiku structuring ─────────────────────────────
async function structureWithHaiku(
  keyLines: string,
  client: Anthropic,
): Promise<OcrResult & { hints: StoreHints }> {
  const today = new Date().toISOString().split('T')[0]

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    temperature: 0,
    messages: [{
      role: 'user',
      content: `以下はレシートのOCR抽出テキスト（重要行のみ）です。JSONのみ返してください（他テキスト不要）。
amount は支出を負数、収入を正数。occurred_on が不明なら今日 ${today}。

{"payee":"正規化した店名（支店名なし）","amount":-1280,"occurred_on":"YYYY-MM-DD","confidence":0.9,"hints":{"totalKeyword":"合　計","datePattern":"YYYY/MM/DD","totalIsLast":true}}

よくある合計キーワード: 合計, 合　計, 小計, お会計, お支払い合計, ご請求額, TOTAL
よくある日付フォーマット: YYYY/MM/DD, YYYY年M月D日, MM/DD(曜日)

OCRテキスト:
${keyLines}`,
    }],
  })

  const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Haiku returned no JSON')

  const parsed = HaikuResponseSchema.safeParse(JSON.parse(jsonMatch[0]))
  if (!parsed.success) throw new Error('Haiku JSON validation failed')

  const { hints, ...result } = parsed.data
  return { ...result, hints: hints ?? {} }
}

// ── Upsert store cache ────────────────────────────────────────────
// INSERT 時のみ hit_count=1 にセット。既存レコードは payee/hints/confidence だけ更新し
// hit_count はリセットしない（lookupStoreCache 側でインクリメント済み）。
async function upsertStoreCache(
  storeKey: string,
  payee: string,
  hints: StoreHints,
  confidence: number,
  householdId: string,
  supabase: SupabaseClient,
): Promise<void> {
  const today = new Date().toISOString().split('T')[0]
  const { data: existing } = await supabase
    .from('ocr_store_cache')
    .select('id')
    .eq('household_id', householdId)
    .eq('store_key', storeKey)
    .single()

  if (existing) {
    await supabase
      .from('ocr_store_cache')
      .update({ payee, hints, confidence, last_seen: today })
      .eq('id', existing.id)
  } else {
    await supabase.from('ocr_store_cache').insert({
      household_id: householdId, store_key: storeKey,
      payee, hints, confidence, hit_count: 1, last_seen: today,
    })
  }
}

// ── Main: 3-layer pipeline ────────────────────────────────────────
export async function structureReceiptText(
  rawText: string,
  householdId: string,
  supabase: SupabaseClient,
): Promise<OcrResult> {
  const today = new Date().toISOString().split('T')[0]

  if (rawText.trim().length < 10) {
    return { payee: '', amount: 0, occurred_on: today, confidence: 0 }
  }

  const keyLines = extractKeyLines(rawText)
  console.log(`[OCR] raw=${rawText.split('\n').length}L key=${keyLines.split('\n').length}L`)

  // Layer 1: rules
  const ruleResult = extractByRules(rawText)
  if (ruleResult.payee && ruleResult.amount && ruleResult.occurred_on) {
    console.log('[OCR] rules hit')
    return { ...ruleResult as OcrResult, confidence: 0.85 }
  }

  // Layer 2: store cache
  const firstLine = rawText.split('\n').find(l => l.trim().length >= 2)?.trim() ?? ''
  const storeKey = normalizeKeyword(firstLine).slice(0, 64)

  if (storeKey.length >= 2) {
    const cached = await lookupStoreCache(storeKey, householdId, supabase)
    if (cached && cached.confidence >= 0.80) {
      const hinted = extractByRules(rawText, cached.hints)
      if (hinted.amount && hinted.occurred_on) {
        console.log('[OCR] store cache hit')
        return {
          payee: cached.payee,  // Haiku正規化済み店名を優先
          amount: hinted.amount,
          occurred_on: hinted.occurred_on,
          confidence: cached.confidence,
        }
      }
    }
  }

  // Layer 3: Haiku
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return { payee: ruleResult.payee ?? '', amount: ruleResult.amount ?? 0, occurred_on: ruleResult.occurred_on ?? today, confidence: 0.3 }
  }

  const client = new Anthropic({ apiKey })
  try {
    const haikuResult = await retryWithBackoff(() => structureWithHaiku(keyLines, client))
    console.log('[OCR] haiku ok, upsert')

    if (storeKey.length >= 2) {
      upsertStoreCache(storeKey, haikuResult.payee, haikuResult.hints, haikuResult.confidence, householdId, supabase)
        .catch(e => console.warn('[OCR] cache upsert failed (migration未適用?)', e))
    }

    const { hints: _h, ...result } = haikuResult
    return result
  } catch (err) {
    console.error('[OCR] haiku failed', err)
    return {
      payee: ruleResult.payee ?? '',
      amount: ruleResult.amount ?? 0,
      occurred_on: ruleResult.occurred_on ?? today,
      confidence: ruleResult.amount ? 0.4 : 0.1,
    }
  }
}
