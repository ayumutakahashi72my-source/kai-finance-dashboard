#!/usr/bin/env tsx
/**
 * PP-OCRv5 ONNX モデルのダウンロードスクリプト
 * 実行: npx tsx scripts/download-ocr-models.ts
 *
 * 配置先: public/models/
 *   - PP-OCRv5_mobile_det_infer.onnx  ~4.8MB  (テキスト検出)
 *   - PP-OCRv5_mobile_rec_infer.onnx  ~16.5MB (テキスト認識)
 *   - ppocrv5_dict.txt                ~74KB   (文字辞書)
 */
import fs from 'fs'
import path from 'path'
import https from 'https'

const MODELS_DIR = path.join(process.cwd(), 'public', 'models')

// PP-OCRv5 mobile ONNX models from paddleocr.js GitHub assets
// Source: https://github.com/x3zvawq/paddleocr.js/tree/main/assets
const FILES: { url: string; name: string; sizeHint: string }[] = [
  {
    url: 'https://raw.githubusercontent.com/x3zvawq/paddleocr.js/main/assets/PP-OCRv5_mobile_det_infer.onnx',
    name: 'PP-OCRv5_mobile_det_infer.onnx',
    sizeHint: '~4.8MB',
  },
  {
    url: 'https://raw.githubusercontent.com/x3zvawq/paddleocr.js/main/assets/PP-OCRv5_mobile_rec_infer.onnx',
    name: 'PP-OCRv5_mobile_rec_infer.onnx',
    sizeHint: '~16.5MB',
  },
  {
    url: 'https://raw.githubusercontent.com/x3zvawq/paddleocr.js/main/assets/ppocrv5_dict.txt',
    name: 'ppocrv5_dict.txt',
    sizeHint: '~74KB',
  },
]

function download(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    const req = https.get(url, { headers: { 'User-Agent': 'kai-ocr-setup/1.0' } }, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        const redirect = res.headers.location!
        file.close()
        fs.unlink(dest, () => {})
        return download(redirect, dest).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} from ${url}`))
        file.close()
        return
      }
      const total = parseInt(res.headers['content-length'] ?? '0', 10)
      let received = 0
      res.on('data', (chunk: Buffer) => {
        received += chunk.length
        if (total > 0) {
          const pct = Math.round((received / total) * 100)
          process.stdout.write(`\r  ${pct}%`)
        }
      })
      res.pipe(file)
      file.on('finish', () => { file.close(); process.stdout.write('\n'); resolve() })
    })
    req.on('error', (err) => { fs.unlink(dest, () => {}); reject(err) })
  })
}

async function main() {
  fs.mkdirSync(MODELS_DIR, { recursive: true })
  console.log(`\nOCRモデルのダウンロード → ${MODELS_DIR}\n`)

  for (const { url, name, sizeHint } of FILES) {
    const dest = path.join(MODELS_DIR, name)
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
      console.log(`  ✓ ${name} (既存)`)
      continue
    }
    process.stdout.write(`  ↓ ${name} ${sizeHint} ...`)
    await download(url, dest)
    console.log(`  ✓ ${name}`)
  }
  console.log('\n完了。npm run dev で開発サーバーを起動してください。\n')
}

main().catch(e => { console.error('\n[ERROR]', e.message); process.exit(1) })
