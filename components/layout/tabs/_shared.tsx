'use client'

// Design tokens (inline to avoid 'use client' boundary issues with KAI shared)
export const CORAL  = '#fb9477'
export const BLUE   = '#7aa7ff'
export const VIOLET = '#a78bfa'
export const GREEN  = '#4ade80'
export const RED    = '#fb7185'
export const AMBER  = '#fbbf24'
export const TEXT1  = 'var(--kai-text1)'
export const TEXT2  = 'var(--kai-text2)'
export const TEXT3  = 'var(--kai-text3)'
export const TEXT4  = 'var(--kai-text4)'
export const TEXT5  = 'var(--kai-text5)'
export const BG     = 'var(--kai-overlay-bg)'
export const OVERLAY_WEAK = 'var(--kai-overlay-weak)'
export const BORDER       = 'var(--kai-border)'
export const BORDER2      = 'var(--kai-border2)'
export const BORDER_STRONG = 'var(--kai-border-strong)'

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
  /** OCR自体が失敗した場合の理由（通信エラー等）。低confidence警告の文言を出し分けるために使う。 */
  errorReason?: string
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
