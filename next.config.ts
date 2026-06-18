import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
    ]
  },
  async redirects() {
    return [
      { source: '/settings/mf', destination: '/settings/integrations/mf', permanent: true },
    ]
  },
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
