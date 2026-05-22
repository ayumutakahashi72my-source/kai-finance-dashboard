'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // 既にインストール済み (standalone) なら表示しない
    if (window.matchMedia('(display-mode: standalone)').matches) return

    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!prompt || dismissed) return null

  const install = async () => {
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted' || outcome === 'dismissed') {
      setPrompt(null)
      setDismissed(true)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom, 16px) + 72px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9000,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'rgba(18,16,26,0.96)',
        border: '1px solid rgba(251,148,119,0.35)',
        borderRadius: 16,
        padding: '12px 16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(12px)',
        maxWidth: 'calc(100vw - 32px)',
        width: 340,
        animation: 'kai-rise 0.35s ease both',
      }}
    >
      {/* アイコン */}
      <img
        src="/app-icon-192.png"
        alt="kai"
        width={40}
        height={40}
        style={{ borderRadius: 10, flexShrink: 0 }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#f0f0f5' }}>
          kai をインストール
        </p>
        <p style={{ margin: 0, fontSize: 11, color: '#8b8ba0', marginTop: 2 }}>
          ホーム画面に追加して素早くアクセス
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#6b6b80',
            fontSize: 12,
            cursor: 'pointer',
            padding: '6px 8px',
          }}
        >
          後で
        </button>
        <button
          onClick={install}
          style={{
            background: 'linear-gradient(135deg, #fb9477 0%, #7aa7ff 100%)',
            border: 'none',
            borderRadius: 8,
            color: '#0a0a10',
            fontSize: 12,
            fontWeight: 800,
            cursor: 'pointer',
            padding: '6px 14px',
            whiteSpace: 'nowrap',
          }}
        >
          追加
        </button>
      </div>
    </div>
  )
}
