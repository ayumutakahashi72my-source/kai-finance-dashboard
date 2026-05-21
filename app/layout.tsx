import type { Metadata, Viewport } from 'next'
import { Inter, Noto_Sans_JP, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { cn } from "@/lib/utils"
import { Providers } from '@/components/providers'

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

export const metadata: Metadata = {
  title: 'KAI — 家計簿管理システム',
  description: 'AI × 家計管理。支出の削減・節約をサポートするダッシュボード。',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/icon-192.png',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: '#0d0d0d',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja" className={cn("h-full", inter.variable, notoSansJP.variable, jetbrainsMono.variable)}>
      <body className="min-h-full antialiased" style={{ fontFamily: "var(--font-inter), var(--font-sans), sans-serif" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
