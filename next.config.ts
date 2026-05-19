import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  serverExternalPackages: ['playwright', 'playwright-core', '@sparticuz/chromium-min'],
  // playwright-core/browsers.json は JS でないため自動トレースに含まれないことがある
  // Vercel Lambda 出力に強制コピーして browsers.json missing を防ぐ
  outputFileTracingIncludes: {
    '/api/settings/mf/sync': [
      './node_modules/playwright-core/browsers.json',
      './node_modules/@sparticuz/chromium-min/**/*',
    ],
  },
}

export default nextConfig
