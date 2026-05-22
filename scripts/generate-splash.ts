/**
 * scripts/generate-splash.ts
 * iOS PWA 用スプラッシュ画面 PNG を生成する。
 * 実行: npx tsx scripts/generate-splash.ts
 *
 * 生成先: public/splash/
 * iOS は media query で device ごとに startup-image を選ぶため、
 * デバイス主要サイズをすべて出力する。
 */

import sharp from 'sharp'
import * as fs from 'fs'
import * as path from 'path'

const BG   = '#0a0a10'
const FROM = '#fb9477'
const TO   = '#7aa7ff'

// iOS デバイス別必要サイズ (portrait: width x height, device-pixel-ratio)
const SIZES = [
  { w: 640,  h: 1136, dpr: 2, label: 'iphone-se'       },
  { w: 750,  h: 1334, dpr: 2, label: 'iphone-8'        },
  { w: 828,  h: 1792, dpr: 2, label: 'iphone-xr'       },
  { w: 1125, h: 2436, dpr: 3, label: 'iphone-x'        },
  { w: 1170, h: 2532, dpr: 3, label: 'iphone-12-14'    },
  { w: 1284, h: 2778, dpr: 3, label: 'iphone-12pm-13pm'},
  { w: 1290, h: 2796, dpr: 3, label: 'iphone-15pm'     },
]

/** kai 波マーク SVG (黒背景込み、center overlay 用) */
function makeSplashSvg(w: number, h: number): string {
  const iconSize = Math.round(Math.min(w, h) * 0.18)
  const cx = w / 2
  const cy = h / 2
  const labelY = cy + iconSize * 0.9

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="wg" x1="0" y1="0" x2="${iconSize}" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${FROM}"/>
      <stop offset="1" stop-color="${TO}"/>
    </linearGradient>
    <!-- spotlight -->
    <radialGradient id="spot" cx="50%" cy="0%" r="60%">
      <stop offset="0" stop-color="#f5d4b8" stop-opacity="0.07"/>
      <stop offset="1" stop-color="#f5d4b8" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- background -->
  <rect width="${w}" height="${h}" fill="${BG}"/>
  <!-- spotlight glow -->
  <rect width="${w}" height="${h}" fill="url(#spot)"/>

  <!-- hairline corners (14px each) -->
  <g stroke="rgba(240,240,245,0.28)" stroke-width="1.2" fill="none">
    <path d="M36 22 L22 22 L22 36"/>
    <path d="M${w-36} 22 L${w-22} 22 L${w-22} 36"/>
    <path d="M36 ${h-22} L22 ${h-22} L22 ${h-36}"/>
    <path d="M${w-36} ${h-22} L${w-22} ${h-22} L${w-22} ${h-36}"/>
  </g>

  <!-- kai wave mark centered -->
  <g transform="translate(${cx - iconSize / 2} ${cy - iconSize * 0.7}) scale(${iconSize / 16})">
    <path d="M1 9 h2.5 l2 -4.5 l3.5 9 l2 -4.5 H15"
      stroke="url(#wg)" stroke-width="1.6"
      stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </g>

  <!-- "kai" wordmark -->
  <text x="${cx}" y="${labelY + iconSize * 0.35}"
    text-anchor="middle" font-family="'Helvetica Neue',Arial,sans-serif"
    font-size="${Math.round(iconSize * 0.46)}" font-weight="200"
    letter-spacing="0.05em" fill="#f0f0f5" opacity="0.95">kai</text>

  <!-- sub label -->
  <text x="${cx}" y="${labelY + iconSize * 0.78}"
    text-anchor="middle" font-family="'Courier New',Courier,monospace"
    font-size="${Math.round(iconSize * 0.15)}" font-weight="600"
    letter-spacing="0.28em" fill="#6b6b80">&#x2015;&#x2015;&#x2015;  家計簿管理  &#x2015;&#x2015;&#x2015;</text>
</svg>`
}

async function main() {
  const outDir = path.join(process.cwd(), 'public', 'splash')
  fs.mkdirSync(outDir, { recursive: true })

  for (const size of SIZES) {
    const svg = makeSplashSvg(size.w, size.h)
    const outPath = path.join(outDir, `${size.label}.png`)

    await sharp(Buffer.from(svg))
      .png({ compressionLevel: 8 })
      .toFile(outPath)

    console.log(`✓ ${size.label}.png  (${size.w}x${size.h})`)
  }

  console.log('\n完了: public/splash/ に出力しました。')
  console.log('layout.tsx の appleWebApp.startupImage に各パスを追加してください。')
}

main().catch(e => { console.error(e); process.exit(1) })
