'use client'

import { useCallback } from 'react'
import { KAI } from '@/lib/kai-tokens'

const MAX_DIGITS = 8

interface NumPadProps {
  value: string
  onChange: (v: string) => void
  onDone: () => void
}

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['00', '0', 'del'],
] as const

export function NumPad({ value, onChange, onDone }: NumPadProps) {
  const handleKey = useCallback((key: string) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10)
    }
    if (key === 'del') {
      onChange(value.slice(0, -1))
      return
    }
    const next = value + key
    if (next.length > MAX_DIGITS) return
    if (next === '0' || next === '00') return
    const cleaned = next.replace(/^0+/, '')
    if (cleaned.length > MAX_DIGITS) return
    onChange(cleaned)
  }, [value, onChange])

  const amount = parseInt(value, 10) || 0
  const formatted = amount > 0 ? amount.toLocaleString('ja-JP') : '0'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div
        style={{
          textAlign: 'center',
          padding: '18px 0 14px',
          fontFamily: 'var(--font-mono), monospace',
          userSelect: 'none',
        }}
      >
        <span style={{ fontSize: 14, color: KAI.text4, fontWeight: 600 }}>¥</span>
        <span
          style={{
            fontSize: 40,
            fontWeight: 800,
            letterSpacing: '-.04em',
            background: `linear-gradient(135deg, ${KAI.text1} 0%, ${KAI.coral} 80%)`,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            lineHeight: 1,
          }}
        >
          {formatted}
        </span>
        <span
          aria-hidden
          style={{
            display: 'inline-block',
            width: 2,
            height: 28,
            background: KAI.coral,
            marginLeft: 2,
            verticalAlign: 'middle',
            animation: 'kai-blink 1s steps(2) infinite',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {KEYS.map((row, ri) => (
          <div key={ri} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {row.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleKey(key)}
                aria-label={key === 'del' ? '削除' : key}
                style={{
                  height: 52,
                  minWidth: 48,
                  borderRadius: 14,
                  border: `1px solid ${KAI.border2}`,
                  background: key === 'del' ? 'rgba(251,113,133,0.08)' : 'rgba(255,255,255,0.03)',
                  color: key === 'del' ? KAI.danger : KAI.text1,
                  fontSize: key === '00' ? 18 : 22,
                  fontWeight: 700,
                  fontFamily: key === 'del' ? 'inherit' : 'var(--font-mono), monospace',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'background .1s',
                }}
              >
                {key === 'del' ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                    <line x1="18" y1="9" x2="12" y2="15" />
                    <line x1="12" y1="9" x2="18" y2="15" />
                  </svg>
                ) : key}
              </button>
            ))}
          </div>
        ))}

        <button
          type="button"
          onClick={onDone}
          disabled={amount <= 0}
          style={{
            height: 50,
            borderRadius: 14,
            border: 'none',
            background: amount > 0
              ? `linear-gradient(135deg, ${KAI.coral} 0%, ${KAI.blue} 100%)`
              : 'rgba(255,255,255,0.06)',
            color: amount > 0 ? '#0a0a10' : KAI.text4,
            fontSize: 15,
            fontWeight: 700,
            cursor: amount > 0 ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            marginTop: 2,
            transition: 'opacity .15s',
            opacity: amount > 0 ? 1 : 0.5,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          完了
        </button>
      </div>
    </div>
  )
}
