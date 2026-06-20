'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { KAI } from '@/lib/kai-tokens'

const MONO: React.CSSProperties = { fontFamily: 'var(--font-mono), "JetBrains Mono", monospace' }

export function AdminAccordion({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ marginTop: 8 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
          padding: '12px 6px', cursor: 'pointer',
          background: 'none', border: 'none', fontFamily: 'inherit',
        }}
      >
        <div style={{
          width: 22, height: 22, borderRadius: 6, flexShrink: 0,
          background: 'rgba(251,148,119,.12)', border: '1px solid rgba(251,148,119,.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={KAI.coral} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 15V3M12 15l-4-4M12 15l4-4" style={{ transform: open ? 'rotate(180deg)' : 'none', transformOrigin: '12px 12px', transition: 'transform .2s' }} />
            <path d="M5 21h14" />
          </svg>
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.13em', color: KAI.coral, ...MONO }}>
          管理者設定
        </span>
        <span style={{
          fontSize: 9, fontWeight: 700, color: KAI.coral,
          background: 'rgba(251,148,119,.12)', border: '1px solid rgba(251,148,119,.25)',
          borderRadius: 5, padding: '2px 6px', ...MONO,
        }}>
          ADMIN
        </span>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={KAI.text4} strokeWidth="2"
          style={{ marginLeft: 'auto', transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div style={{ animation: 'kai-rise .3s ease-out both' }}>
          {children}
        </div>
      )}
    </div>
  )
}
