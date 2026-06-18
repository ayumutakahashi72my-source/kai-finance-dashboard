'use client'

import { todayJST } from '@/lib/jst'
import { KAI } from '@/lib/kai-tokens'

export const CORAL  = KAI.coral
export const BLUE   = KAI.blue
export const VIOLET = KAI.violet
export const GREEN  = KAI.success
export const RED    = KAI.danger
export const AMBER  = KAI.warning
export const TEXT1  = KAI.text1
export const TEXT2  = KAI.text2
export const TEXT3  = KAI.text3
export const TEXT4  = KAI.text4
export const TEXT5  = KAI.text5
export const BG     = KAI.bg

export const today = () => todayJST()

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
