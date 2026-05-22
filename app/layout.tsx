import type { Metadata, Viewport } from 'next'
import { Inter, Noto_Sans_JP, JetBrains_Mono, Instrument_Serif } from 'next/font/google'
import './globals.css'
import { cn } from "@/lib/utils"
import { Providers } from '@/components/providers'
import { HairlineSplash } from '@/components/kai/HairlineSplash'

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
    startupImage: ['/app-icon-1024.png'],
  },
  icons: {
    icon: [
      { url: '/app-icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/app-icon-512.png', sizes: '512x512', type: 'image/png' },
      { url: '/app-icon.svg',     type: 'image/svg+xml' },
    ],
    apple: [{ url: '/app-icon-180.png', sizes: '180x180' }],
  },
  manifest: '/manifest.webmanifest',
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
    <html lang="ja" suppressHydrationWarning className={cn("h-full", inter.variable, notoSansJP.variable, jetbrainsMono.variable, instrumentSerif.variable)}>
      <body className="min-h-full antialiased" style={{ fontFamily: "var(--font-inter), var(--font-sans), sans-serif" }}>
        <HairlineSplash />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
