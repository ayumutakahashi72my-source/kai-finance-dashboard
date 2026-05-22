import type { Metadata, Viewport } from 'next'
import { Inter, Noto_Sans_JP, JetBrains_Mono, Instrument_Serif } from 'next/font/google'
import './globals.css'
import { cn } from "@/lib/utils"
import { Providers } from '@/components/providers'
import { HairlineSplash } from '@/components/kai/HairlineSplash'
import { InstallBanner } from '@/components/kai/InstallBanner'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
})

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-sans',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jetbrains',
  display: 'swap',
})

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'kai — 家計簿管理',
  applicationName: 'kai',
  description: 'AI × 家計管理。支出の削減・節約をサポートするダッシュボード。',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'kai',
    startupImage: [
      // iPhone SE (2nd/3rd gen) 750×1334 @2x → 375×667pt
      { url: '/splash/iphone-8.png',       media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)' },
      // iPhone SE 1st gen 640×1136 @2x → 320×568pt
      { url: '/splash/iphone-se.png',      media: '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)' },
      // iPhone XR / 11  828×1792 @2x → 414×896pt
      { url: '/splash/iphone-xr.png',      media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)' },
      // iPhone X/XS/11 Pro  1125×2436 @3x → 375×812pt
      { url: '/splash/iphone-x.png',       media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)' },
      // iPhone 12/13/14  1170×2532 @3x → 390×844pt
      { url: '/splash/iphone-12-14.png',   media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)' },
      // iPhone 12/13/14 Pro Max  1284×2778 @3x → 428×926pt
      { url: '/splash/iphone-12pm-13pm.png', media: '(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)' },
      // iPhone 15 Pro Max  1290×2796 @3x → 430×932pt
      { url: '/splash/iphone-15pm.png',    media: '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)' },
    ],
  },
  icons: {
    icon: [
      { url: '/app-icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/app-icon-512.png', sizes: '512x512', type: 'image/png' },
      { url: '/app-icon.svg',     type: 'image/svg+xml' },
    ],
    apple: [{ url: '/app-icon-180.png', sizes: '180x180' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0a10',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja" suppressHydrationWarning className={cn("h-full dark", inter.variable, notoSansJP.variable, jetbrainsMono.variable, instrumentSerif.variable)} style={{ background: '#0a0a10' }}>
      <body className="min-h-full antialiased" style={{ fontFamily: "var(--font-inter), var(--font-sans), sans-serif", background: '#0a0a10' }}>
        <HairlineSplash />
        <Providers>
          {children}
          <InstallBanner />
        </Providers>
      </body>
    </html>
  )
}
