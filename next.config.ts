import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  serverExternalPackages: [
    'playwright', 'playwright-core', '@sparticuz/chromium-min',
    'onnxruntime-node',
    'paddleocr',
    'sharp',
  ],
  outputFileTracingIncludes: {
    '/api/settings/mf/sync': [
      './node_modules/playwright-core/browsers.json',
      './node_modules/@sparticuz/chromium-min/**/*',
    ],
    '/api/transactions/ocr': [
      './node_modules/onnxruntime-node/bin/napi-v3/linux/**',
      './public/models/**',
    ],
  },
  outputFileTracingExcludes: {
    '*': [
      './node_modules/onnxruntime-node/bin/napi-v3/win32/**',
      './node_modules/onnxruntime-node/bin/napi-v3/darwin/**',
    ],
  },
}

export default nextConfig
