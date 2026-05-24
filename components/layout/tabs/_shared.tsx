'use client'

// Design tokens (inline to avoid 'use client' boundary issues with KAI shared)
export const CORAL  = '#fb9477'
export const BLUE   = '#7aa7ff'
export const VIOLET = '#a78bfa'
export const GREEN  = '#4ade80'
export const RED    = '#fb7185'
export const AMBER  = '#fbbf24'
export const TEXT1  = '#f0f0f5'
export const TEXT2  = '#c4c4d0'
export const TEXT3  = '#8b8ba0'
export const TEXT4  = '#5e5e72'
export const TEXT5  = '#3e3e55'
export const BG     = 'rgba(18,16,28,0.97)'

export const today = () => new Date().toISOString().split('T')[0]

export interface ImportResult {
  inserted: number
  skipped: number
  classified: number
  categoriesCreated: number
  parseErrors: string[]
}

export interface SyncResult {
  inserted: number
  skipped: number
  year: number
  month: number
}

export interface OcrPrefill {
  payee?: string
  amount?: number
  occurred_on?: string
  confidence?: number
}

export function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'none', border: 'none', color: TEXT3, fontSize: 13,
        fontWeight: 600, cursor: 'pointer', padding: '0 0 16px',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      戻る
    </button>
  )
}
