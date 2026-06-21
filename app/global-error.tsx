'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="ja">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a10',
          fontFamily: 'Inter, -apple-system, sans-serif',
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
              color: '#f0eff4',
              marginBottom: 8,
            }}
          >
            予期しないエラーが発生しました
          </h1>
          <p
            style={{
              fontSize: 13,
              color: '#85849a',
              lineHeight: 1.7,
              marginBottom: 24,
            }}
          >
            アプリケーション全体で問題が発生しました。再試行するか、しばらく経ってからアクセスしてください。
            {error.digest && (
              <span
                style={{
                  display: 'block',
                  marginTop: 8,
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 11,
                  color: '#5e5e72',
                }}
              >
                Error ID: {error.digest}
              </span>
            )}
          </p>
          <button
            onClick={reset}
            style={{
              padding: '10px 24px',
              borderRadius: 12,
              background: 'linear-gradient(135deg,#a78bfa,#fb9477)',
              color: '#0a0a10',
              fontSize: 14,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(167,139,250,0.3)',
            }}
          >
            再試行
          </button>
        </div>
      </body>
    </html>
  )
}
