import * as path from 'path'
import * as fs from 'fs'
import sharp from 'sharp'
import { PaddleOcrService } from 'paddleocr'
import * as ort from 'onnxruntime-node'
import type { OCRBlock } from './types'

// ── Singleton + inference mutex on globalThis ─────────────────────
// globalThis を使うことで Fluid Compute の module re-evaluation を耐える。
// __ocrInferLock: ONNX Runtime セッションはスレッドセーフではないため、
//                 並行 recognize() 呼び出しを直列化する。
type OcrService = Awaited<ReturnType<typeof PaddleOcrService.createInstance>>

declare global {
  var __ocrService:      OcrService | undefined
  var __ocrInitPromise:  Promise<OcrService> | undefined
  var __ocrInferLock:    Promise<void> | undefined
}

async function getOcrService(): Promise<OcrService> {
  if (globalThis.__ocrService) return globalThis.__ocrService
  if (globalThis.__ocrInitPromise) return globalThis.__ocrInitPromise

  globalThis.__ocrInitPromise = (async () => {
    try {
      const modelsDir = path.join(process.cwd(), 'public', 'models')
      const detPath   = path.join(modelsDir, 'PP-OCRv5_mobile_det_infer.onnx')
      const recPath   = path.join(modelsDir, 'PP-OCRv5_mobile_rec_infer.onnx')
      const dictPath  = path.join(modelsDir, 'ppocrv5_dict.txt')

      if (!fs.existsSync(detPath) || !fs.existsSync(recPath)) {
        throw new Error('OCRモデルが見つかりません。npx tsx scripts/download-ocr-models.ts を実行してください。')
      }

      const detBuf    = fs.readFileSync(detPath)
      const recBuf    = fs.readFileSync(recPath)
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

      globalThis.__ocrService     = service
      globalThis.__ocrInitPromise = undefined
      return service
    } catch (err) {
      globalThis.__ocrInitPromise = undefined
      throw err
    }
  })()

  return globalThis.__ocrInitPromise
}

// ── Preprocessing ──────────────────────────────────────────────────
async function toImageData(buf: Buffer) {
  const { data, info } = await sharp(buf)
    .rotate()
    .resize({ width: 1800, height: 3600, fit: 'inside', withoutEnlargement: true })
    .modulate({ saturation: 0 })
    .normalize()
    .linear(1.4, -20)
    .sharpen({ sigma: 1.0, m1: 1.5, m2: 0.7 })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .raw()
    .toBuffer({ resolveWithObject: true })

  return { data: new Uint8Array(data), width: info.width, height: info.height }
}

type RawResult = { text: string; score: number; box?: number[][] }

export async function extractReceiptBlocks(buf: Buffer): Promise<OCRBlock[]> {
  const service   = await getOcrService()
  const imageData = await toImageData(buf)

  // ── Serialize inference calls (ONNX session は非スレッドセーフ) ──
  // FIFO キュー: 前のリクエストが終わるまで待機してから推論を実行する。
  let unlock!: () => void
  const acquired = new Promise<void>(r => { unlock = r })
  const prev = globalThis.__ocrInferLock ?? Promise.resolve()
  globalThis.__ocrInferLock = acquired
  await prev

  let recResults: RawResult[]
  try {
    recResults = await service.recognize(imageData, {
      ordering: { sortByReadingOrder: true, sameLineThresholdRatio: 0.25 },
    }) as unknown as RawResult[]
  } finally {
    unlock()
  }

  const { width, height } = imageData

  return recResults
    .filter(r => r.text?.trim())
    .map(r => {
      let x = 0, y = 0, w = 1, h = 1
      if (r.box && r.box.length >= 4) {
        const xs = r.box.map(p => p[0])
        const ys = r.box.map(p => p[1])
        const x1 = Math.min(...xs), x2 = Math.max(...xs)
        const y1 = Math.min(...ys), y2 = Math.max(...ys)
        x = x1 / width
        y = y1 / height
        w = (x2 - x1) / width
        h = (y2 - y1) / height
      }
      return {
        text:  r.text.trim(),
        score: r.score ?? 1,
        bbox:  { x, y, w, h },
      }
    })
}
