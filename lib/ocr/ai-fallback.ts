import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { retryWithBackoff } from '@/lib/retry'
import { todayJST } from './jst'
import type { NormalizedBlock, OcrResult } from './types'

const AI_TIMEOUT_MS = 5000

// タイムアウト・レート制限はリトライしない (過負荷時に再送しても無意味)
function isRetryableAIError(err: unknown): boolean {
  if (!(err instanceof Error)) return true
  const msg = err.message.toLowerCase()
  return !msg.includes('timeout') && !msg.includes('timed out') && !msg.includes('429')
}

const ResponseSchema = z.object({
  payee:           z.string().max(100),
  amount:          z.number(),
  occurred_on:     z.string()
    .regex(/^\d{4}-\d{1,2}-\d{1,2}$/)
    .transform(s => {
      const [y, m, d] = s.split('-')
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }),
  confidence:      z.number().min(0).max(1),
  canonical_chain: z.string().optional(),
})

const TOTAL_PAT = /合計|お会計|お支払い|ご請求|TOTAL/
const DATE_PAT  = /\d{4}[\/\-年]\d{1,2}[\/\-月]\d{1,2}|令和|平成/
const TEL_PAT   = /TEL|電話|℡|\d{2,4}[-－]\d{3,4}[-－]\d{4}/

/**
 * AI に送る行は 最大20行 に絞る。
 * - 上位5行 (店名候補)
 * - TEL行
 * - 日付行
 * - 合計周辺行
 * 商品一覧の全文は絶対に含めない。
 */
function toKeyLines(blocks: NormalizedBlock[]): string {
  const lines = blocks
    .filter(b => !b.isNoise && !b.isVertical && b.textNorm.length >= 1)
    .map(b => b.textNorm)

  if (lines.length <= 20) return lines.join('\n')

  const keep = new Set<number>()

  // 上位5行 (店名候補)
  for (let i = 0; i < Math.min(5, lines.length); i++) keep.add(i)

  // TEL / 日付 / 合計周辺
  lines.forEach((l, i) => {
    if (TOTAL_PAT.test(l) || DATE_PAT.test(l) || TEL_PAT.test(l)) {
      keep.add(i)
      if (i + 1 < lines.length) keep.add(i + 1) // 合計値は次行にある場合も
    }
  })

  // 末尾10行 (合計・日付は下部に集中)
  for (let i = Math.max(0, lines.length - 10); i < lines.length; i++) keep.add(i)

  return [...keep].sort((a, b) => a - b).map(i => lines[i]).join('\n')
}

export async function applyAIFallback(
  blocks: NormalizedBlock[],
  partial: Partial<OcrResult>,
): Promise<OcrResult & { canonicalChain?: string }> {
  const today = todayJST()
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    console.warn('[ocr] ANTHROPIC_API_KEY not set — AI fallback disabled, returning low-confidence heuristic result')
    return { payee: partial.payee ?? '', amount: partial.amount ?? 0, occurred_on: partial.occurred_on ?? today, confidence: 0.1 }
  }

  const keyLines = toKeyLines(blocks)
  const client   = new Anthropic({ apiKey })

  const msg = await retryWithBackoff(
    () => client.messages.create(
      {
        model:       'claude-haiku-4-5-20251001',
        max_tokens:  300,
        temperature: 0,
        messages: [{
          role: 'user',
          content: `レシートOCRテキスト（重要行抜粋）からJSONのみ返してください。
amountは支出を負数、返品・返金は正数。occurred_onが不明なら今日${today}。canonical_chainはチェーン名（支店名なし）。

{"payee":"正規化店名","amount":-1280,"occurred_on":"YYYY-MM-DD","confidence":0.9,"canonical_chain":"チェーン名"}

OCR:
${keyLines}`,
        }],
      },
      { timeout: AI_TIMEOUT_MS },
    ),
    { maxRetries: 2, shouldRetry: isRetryableAIError },
  )

  const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI returned no JSON')

  const parsed = ResponseSchema.safeParse(JSON.parse(jsonMatch[0]))
  if (!parsed.success) throw new Error(`AI JSON invalid: ${parsed.error.message}`)

  return {
    payee:          parsed.data.payee,
    amount:         parsed.data.amount,
    occurred_on:    parsed.data.occurred_on,
    confidence:     parsed.data.confidence,
    canonicalChain: parsed.data.canonical_chain,
  }
}
