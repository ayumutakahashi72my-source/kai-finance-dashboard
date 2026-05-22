import Link from 'next/link'
import type { ReactNode } from 'react'

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full" style={{ background: '#0a0a10', color: '#e2e8f0' }}>
      <header className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b border-white/10" style={{ background: '#0a0a10' }}>
        <Link
          href="/login"
          className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          戻る
        </Link>
      </header>
      <main className="mx-auto max-w-2xl px-5 py-8 pb-16">
        {children}
      </main>
    </div>
  )
}
