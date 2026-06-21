'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[error.tsx]', error)
    import('@/lib/event-logger').then(({ reportError }) => reportError(error, 'error-boundary')).catch(() => {})
  }, [error])

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--kai-bg)',
        padding: 24,
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 380 }}>
        <div
          style={{
            width: 56,
            height: 56,
            margin: '0 auto 20px',
            borderRadius: 16,
            background: 'rgba(251,113,133,0.12)',
            border: '1px solid rgba(251,113,133,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fb7185" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--kai-text1)',
            marginBottom: 8,
          }}
        >
          エラーが発生しました
        </h1>
        <p
          style={{
            fontSize: 13,
            color: 'var(--kai-text3)',
            lineHeight: 1.7,
            marginBottom: 24,
          }}
        >
          ページの読み込み中に問題が発生しました。
          {error.digest && (
            <span
              style={{
                display: 'block',
                marginTop: 8,
                fontFamily: 'var(--font-jetbrains),monospace',
                fontSize: 11,
                color: 'var(--kai-text4)',
              }}
            >
              Error ID: {error.digest}
            </span>
          )}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={reset}
            style={{
              padding: '10px 24px',
              borderRadius: 12,
              background: 'linear-gradient(135deg,#a78bfa,#fb9477)',
              color: 'var(--kai-bg)',
              fontSize: 14,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(167,139,250,0.3)',
            }}
          >
            再試行
          </button>
          <button
            onClick={() => { window.location.href = '/' }}
            style={{
              padding: '10px 24px',
              borderRadius: 12,
              background: 'var(--kai-overlay-weak)',
              border: '1px solid var(--kai-border)',
              color: 'var(--kai-text2)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            ホームに戻る
          </button>
        </div>
      </div>
    </div>
  )
}
