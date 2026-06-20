import Link from 'next/link'
import type { ReactNode } from 'react'

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full" style={{ background: 'var(--kai-bg)', color: 'var(--kai-text1)' }}>
      <header className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b border-[var(--kai-border2)]" style={{ background: 'var(--kai-bg)' }}>
        <Link
          href="/login"
          className="flex items-center gap-1.5 text-sm text-[var(--kai-text3)] hover:text-[var(--kai-text1)] transition-colors"
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
