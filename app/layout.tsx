import type { Metadata } from 'next'
import { Inter, Geist } from 'next/font/google'
import './globals.css'
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
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
    <html lang="ja" className={cn("h-full", inter.variable, "font-sans", geist.variable)}>
      <body className="min-h-full antialiased">
        {children}
      </body>
    </html>
  )
}
