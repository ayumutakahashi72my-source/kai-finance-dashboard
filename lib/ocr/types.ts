export interface OCRBlock {
  text: string
  score: number
  bbox: { x: number; y: number; w: number; h: number }
}

export interface NormalizedBlock {
  text: string
  textNorm: string
  score: number
  bbox: { x: number; y: number; w: number; h: number }
  lineGroup: number
  isVertical: boolean
  isNoise: boolean
}

export interface OcrResult {
  payee: string
  amount: number
  occurred_on: string
  confidence: number
}

export interface OcrTimings {
  ocr_ms: number
  normalize_ms: number
  merchant_ms: number
  embedding_ms: number
  ai_ms: number
  total_ms: number
}

export interface MerchantResult {
  merchant: string
  canonicalChain: string
  confidence: number
}

export interface AmountResult {
  amount: number
  confidence: number
}

export interface DateResult {
  date: string
  confidence: number
}
