'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// layout.tsx の早期スクリプトが window.__pwaInstallEvent に保存している
declare global {
  interface Window {
    __pwaInstallEvent?: BeforeInstallPromptEvent | null
  }
}

type Platform = 'chrome-android' | 'ios' | 'samsung' | 'chrome-desktop' | 'other'

function detectPlatform(): Platform {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios'
  if (/SamsungBrowser/.test(ua)) return 'samsung'
  if (/Android/.test(ua) && /Chrome/.test(ua)) return 'chrome-android'
  if (/Chrome/.test(ua) && !/Mobile/.test(ua)) return 'chrome-desktop'
  return 'other'
}

const DISMISSED_KEY = 'kai-install-dismissed'

export function InstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [platform, setPlatform] = useState<Platform | null>(null)
  const [showGuide, setShowGuide] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if (sessionStorage.getItem(DISMISSED_KEY)) return

    const p = detectPlatform()
    // 'other' は beforeinstallprompt があれば表示、なければスキップ
    if (p === 'other' && !window.__pwaInstallEvent) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlatform(p)

    // 早期キャプチャ済みのイベントを取得
    if (window.__pwaInstallEvent) {
      setDeferred(window.__pwaInstallEvent)
      window.__pwaInstallEvent = null
    }

    // 念のため未来のイベントも待つ
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const dismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, '1')
    setDismissed(true)
  }

  const handleInstall = async () => {
    if (deferred) {
      await deferred.prompt()
      const { outcome } = await deferred.userChoice
      if (outcome === 'accepted') { dismiss(); return }
    }
    setShowGuide(true)
  }

  if (dismissed || !platform) return null

  const guideText: Record<Platform, string[]> = {
    'chrome-android':  ['画面右上の「⋮」をタップ', '「アプリをインストール」または「ホーム画面に追加」をタップ'],
    'samsung':         ['画面下の「☰」メニューをタップ', '「ページを追加」→「ホーム画面」をタップ'],
    'ios':             ['画面下の「□↑」共有ボタンをタップ', '「ホーム画面に追加」をタップ'],
    'chrome-desktop':  ['アドレスバー右端のインストールアイコン（⊕）をクリック', 'または右上の「⋮」→「kai をインストール」をクリック'],
    'other':           ['ブラウザのメニューから「ホーム画面に追加」を選択'],
  }

  return (
    <>
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
          background: 'var(--kai-bg-card)',
          border: '1px solid rgba(251,148,119,0.35)',
          borderRadius: 16,
          padding: '12px 16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(16px)',
          maxWidth: 'calc(100vw - 32px)',
          width: 340,
          animation: 'kai-rise 0.35s ease both',
        }}
      >
        <Image src="/app-icon-192.png" alt="kai" width={40} height={40}
          style={{ borderRadius: 10, flexShrink: 0 }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--kai-text1)' }}>
            kai をインストール
          </p>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--kai-text3)', marginTop: 2 }}>
            ホーム画面に追加して素早くアクセス
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={dismiss}
            style={{ background: 'transparent', border: 'none', color: 'var(--kai-text4)',
              fontSize: 12, cursor: 'pointer', padding: '6px 8px' }}>
            後で
          </button>
          <button onClick={handleInstall}
            style={{ background: 'linear-gradient(135deg,#fb9477,#7aa7ff)', border: 'none',
              borderRadius: 8, color: '#0a0a10', fontSize: 12, fontWeight: 800,
              cursor: 'pointer', padding: '6px 14px', whiteSpace: 'nowrap' }}>
            追加
          </button>
        </div>
      </div>

      {showGuide && (
        <div
          onClick={() => setShowGuide(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.7)', display: 'flex',
            alignItems: 'flex-end', justifyContent: 'center',
            padding: '0 16px 32px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--kai-bg-card)', border: '1px solid var(--kai-border2)',
              borderRadius: 20, padding: '24px 20px', width: '100%', maxWidth: 400,
            }}
          >
            <p style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: 'var(--kai-text1)' }}>
              ホーム画面へ追加する方法
            </p>
            <ol style={{ margin: 0, padding: '0 0 0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(guideText[platform] ?? guideText.other).map((step, i) => (
                <li key={i} style={{ fontSize: 14, color: 'var(--kai-text2)', lineHeight: 1.5 }}>{step}</li>
              ))}
            </ol>
            <button
              onClick={() => { setShowGuide(false); dismiss() }}
              style={{
                marginTop: 20, width: '100%', padding: '12px',
                background: 'linear-gradient(135deg,#fb9477,#7aa7ff)',
                border: 'none', borderRadius: 12, color: '#0a0a10',
                fontSize: 14, fontWeight: 800, cursor: 'pointer',
              }}
            >
              わかった
            </button>
          </div>
        </div>
      )}
    </>
  )
}
