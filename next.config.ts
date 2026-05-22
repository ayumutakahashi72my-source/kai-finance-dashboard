import type { NextConfig } from 'next'
import path from 'path'
import withPWA from '@ducanh2912/next-pwa'

const baseConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Native addon をバンドルせずランタイムの node_modules から参照させる
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

export default withPWA({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    disableDevLogs: true,
  },
})(baseConfig)
