#!/usr/bin/env tsx
/**
 * PP-OCRv5 ONNX モデルのダウンロードスクリプト
 * 実行: npx tsx scripts/download-ocr-models.ts
 *
 * 配置先: public/models/
 *   - PP-OCRv5_mobile_det_infer.onnx  ~4.8MB  (テキスト検出)
 *   - PP-OCRv5_mobile_rec_infer.onnx  ~16.5MB (テキスト認識)
 *   - ppocrv5_dict.txt                ~74KB   (文字辞書)
 *
 * 取得元（上から順に試行し、SHA256 が一致したものだけ採用）:
 *   1. paddleocr.js の assets 削除直前コミットに固定した raw URL（不変）
 *      上流は bae1a31「外置ONNX模型资产仓库」で assets/ を削除したため main ブランチの URL は 404
 *   2. 上流が案内している公式の移転先 Hugging Face: x3zvawq/paddleocr-js-onnx
 */
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import https from 'https'

const MODELS_DIR = path.join(process.cwd(), 'public', 'models')

// assets/ を削除したコミット (bae1a31) の親 = モデルが存在する最後のコミット
const PINNED_COMMIT = '955f35216dfbc1719e480efaf10546b9448e8d6d'
const GITHUB_BASE = `https://raw.githubusercontent.com/X3ZvaWQ/paddleocr.js/${PINNED_COMMIT}/assets`
const HF_BASE = 'https://huggingface.co/x3zvawq/paddleocr-js-onnx/resolve/main/ppocr_v5_mobile'

const FILES: { name: string; sizeHint: string; sha256: string }[] = [
  {
    name: 'PP-OCRv5_mobile_det_infer.onnx',
    sizeHint: '~4.8MB',
    sha256: '4d97c44a20d30a81aad087d6a396b08f786c4635742afc391f6621f5c6ae78ae',
  },
  {
    name: 'PP-OCRv5_mobile_rec_infer.onnx',
    sizeHint: '~16.5MB',
    sha256: '86b1f8bffa31748e0d6364a98af983bbd33b92523141d4a02fa587b4b66b54af',
  },
  {
    name: 'ppocrv5_dict.txt',
    sizeHint: '~74KB',
    sha256: '7680a8a77c6617aba27bc9c52d320f451ae7871613a43b5358ac4a68c88d87c0',
  },
]

const MAX_REDIRECTS = 5

function sha256Of(file: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
}

function download(url: string, dest: string, redirects = 0): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'kai-ocr-setup/1.0' } }, (res) => {
      const status = res.statusCode ?? 0
      // Hugging Face は 302/307 で CDN にリダイレクトする（相対 Location の場合あり）
      if ([301, 302, 303, 307, 308].includes(status) && res.headers.location) {
        res.resume()
        if (redirects >= MAX_REDIRECTS) return reject(new Error(`too many redirects from ${url}`))
        const next = new URL(res.headers.location, url).toString()
        return download(next, dest, redirects + 1).then(resolve).catch(reject)
      }
      if (status !== 200) {
        res.resume()
        return reject(new Error(`HTTP ${status} from ${url}`))
      }
      const file = fs.createWriteStream(dest)
      const total = parseInt(res.headers['content-length'] ?? '0', 10)
      let received = 0
      res.on('data', (chunk: Buffer) => {
        received += chunk.length
        if (total > 0) process.stdout.write(`\r  ${Math.round((received / total) * 100)}%`)
      })
      res.on('error', reject)
      file.on('error', reject)
      file.on('finish', () => { process.stdout.write('\n'); resolve() })
      res.pipe(file)
    })
    req.on('error', reject)
  })
}

/** 取得元を順に試し、ハッシュが一致したファイルを dest に配置する */
async function fetchVerified(name: string, expected: string, dest: string): Promise<void> {
  const tmp = `${dest}.download`
  const errors: string[] = []
  for (const base of [GITHUB_BASE, HF_BASE]) {
    const url = `${base}/${name}`
    try {
      await download(url, tmp)
      const actual = sha256Of(tmp)
      if (actual !== expected) throw new Error(`SHA256 mismatch from ${url} (got ${actual})`)
      fs.renameSync(tmp, dest)
      return
    } catch (e) {
      fs.rmSync(tmp, { force: true })
      errors.push((e as Error).message)
      console.warn(`  ! ${(e as Error).message}`)
    }
  }
  throw new Error(`${name} を取得できませんでした:\n    ${errors.join('\n    ')}`)
}

async function main() {
  fs.mkdirSync(MODELS_DIR, { recursive: true })
  console.log(`\nOCRモデルのダウンロード → ${MODELS_DIR}\n`)

  for (const { name, sizeHint, sha256 } of FILES) {
    const dest = path.join(MODELS_DIR, name)
    if (fs.existsSync(dest)) {
      if (sha256Of(dest) === sha256) {
        console.log(`  ✓ ${name} (既存)`)
        continue
      }
      console.warn(`  ! ${name} のハッシュが一致しないため再取得します`)
    }
    console.log(`  ↓ ${name} ${sizeHint} ...`)
    await fetchVerified(name, sha256, dest)
    console.log(`  ✓ ${name}`)
  }
  console.log('\n完了。npm run dev で開発サーバーを起動してください。\n')
}

main().catch(e => { console.error('\n[ERROR]', e.message); process.exit(1) })
