import type { Metadata } from 'next'
import { Noto_Sans_JP, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { cn } from "@/lib/utils"
import { Providers } from '@/components/providers'

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-sans',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jetbrains',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'KAI — 家計簿管理システム',
  description: 'AI × 家計管理。支出の削減・節約をサポートするダッシュボード。',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja" className={cn("h-full", notoSansJP.variable, jetbrainsMono.variable)}>
      <body className="min-h-full antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
