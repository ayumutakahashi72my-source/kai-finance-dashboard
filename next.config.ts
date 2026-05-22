import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Native addon をバンドルせずランタイムの node_modules から参照させる
  // → webpack がバイナリを取り込まないためサイズ削減に効く
  serverExternalPackages: [
    'playwright', 'playwright-core', '@sparticuz/chromium-min',
    'onnxruntime-node',
    'paddleocr',
    'sharp',
  ],
  outputFileTracingIncludes: {
    // playwright: browsers.json が自動トレース外のため明示コピー
    '/api/settings/mf/sync': [
      './node_modules/playwright-core/browsers.json',
      './node_modules/@sparticuz/chromium-min/**/*',
    ],
    // OCR: Linux x64 バイナリ + ONNX モデルファイルを含める
    '/api/transactions/ocr': [
      './node_modules/onnxruntime-node/bin/napi-v3/linux/**',
      './public/models/**',
    ],
  },
  // Windows・macOS バイナリを全ルートから除外（~170MB削減）
  outputFileTracingExcludes: {
    '*': [
      './node_modules/onnxruntime-node/bin/napi-v3/win32/**',
      './node_modules/onnxruntime-node/bin/napi-v3/darwin/**',
    ],
  },
}

export default nextConfig
