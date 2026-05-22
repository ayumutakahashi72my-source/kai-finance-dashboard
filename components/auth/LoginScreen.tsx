// components/auth/LoginScreen.tsx
//
// Airbnb 風レイアウトのログイン画面。Google サインインのみ。
// `design_handoff_kai_finance/kai-c-login.jsx` の V1 (Editorial Quiet) を移植。
//
/* ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  DESIGN-LOCKED — Claude Code への絶対ルール                              ║
 * ║   1. ボタンは画面の縦中央に置く (top: 50% + translateY)。動かさない。      ║
 * ║   2. 認証プロバイダは Google のみ。Apple / メール / SSO を勝手に足さない。 ║
 * ║   3. 見出しは Hiragino Sans Light 1 行のみ。コピー量を増やさない。         ║
 * ║   4. 利用規約は 4 リンクの長文を維持 (Airbnb 風の "I agree to..." 体)。    ║
 * ║   5. 背景の暖色グラデを単色やフラットに変えない。                          ║
 * ║   6. signIn ハンドラはサーバー設定に依存するので呼び出し側で渡す。         ║
 * ╚══════════════════════════════════════════════════════════════════════════╝ */

'use client'

import * as React from 'react'
import { KAI } from '@/lib/kai-tokens'
import { BigKaiMark } from './BigKaiMark'

interface LoginScreenProps {
  onGoogleSignIn?: () => void | Promise<void>
  onTermsClick?: (kind: 'tos' | 'privacy' | 'cookie' | 'data') => void
}

const PEACH = '#f5d4b8'

export function LoginScreen({ onGoogleSignIn, onTermsClick }: LoginScreenProps) {
  return (
    <main
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        color: KAI.text1,
        fontFamily: 'var(--font-sans), Inter, sans-serif',
      }}
    >
      {/* 暖色グラデ背景 (左寄り) */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse 680px 540px at -4% 22%, ${KAI.coral}38 0%, ${KAI.coral}12 35%, transparent 65%),
            radial-gradient(ellipse 480px 360px at 8% 78%, ${PEACH}18 0%, transparent 60%),
            radial-gradient(ellipse 420px 320px at 95% 92%, ${KAI.blue}12 0%, transparent 65%),
            linear-gradient(150deg, #1f1218 0%, var(--kai-bg-card) 55%, var(--kai-bg) 100%)
          `,
        }}
      />

      {/* 左上: kai マーク */}
      <div
        style={{
          position: 'absolute',
          top: 'max(env(safe-area-inset-top, 16px), 32px)',
          left: 30,
          right: 30,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          animation: 'kai-splash-fade-soft .6s 0s both',
        }}
      >
        <BigKaiMark
          size={66}
          gradientId="login-mark"
          from={KAI.coral}
          to={KAI.blue}
          drawDuration={1.1}
          glow={false}
        />
      </div>

      {/* 中央: 見出し + Google ボタン */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: 30,
          right: 30,
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: 36,
          maxWidth: 420,
          margin: '0 auto',
        }}
      >
        <div style={{ animation: 'kai-splash-fade .9s .25s both ease-out' }}>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-serif), "Georgia", serif',
              fontStyle: 'italic',
              fontSize: 36,
              fontWeight: 400,
              letterSpacing: '-.01em',
              lineHeight: 1.3,
              color: KAI.text1,
            }}
          >
            kaiへようこそ
          </h1>
        </div>
        <div style={{ animation: 'kai-splash-fade .9s .55s both ease-out' }}>
          <GoogleSignInButton onClick={onGoogleSignIn} />
        </div>
      </div>

      {/* 下部: 利用規約 */}
      <div
        style={{
          position: 'absolute',
          left: 30,
          right: 30,
          bottom: 'max(env(safe-area-inset-bottom, 16px), 48px)',
          maxWidth: 420,
          margin: '0 auto',
          animation: 'kai-splash-fade-soft 1s .9s both',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: 'rgba(240,240,245,.6)',
            lineHeight: 1.7,
            letterSpacing: '.005em',
          }}
        >
          続行することで、私は kai の
          <TermsLink onClick={() => onTermsClick?.('tos')}>
            サービス利用規約
          </TermsLink>
          、
          <TermsLink onClick={() => onTermsClick?.('privacy')}>
            プライバシーポリシー
          </TermsLink>
          、
          <TermsLink onClick={() => onTermsClick?.('cookie')}>
            Cookieポリシー
          </TermsLink>
          、および
          <TermsLink onClick={() => onTermsClick?.('data')}>
            データ取り扱いに関する方針
          </TermsLink>
          に同意します。
        </p>
      </div>
    </main>
  )
}

function GoogleSignInButton({
  onClick,
}: {
  onClick?: () => void | Promise<void>
}) {
  const [busy, setBusy] = React.useState(false)
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        if (!onClick || busy) return
        setBusy(true)
        try {
          await onClick()
        } finally {
          setBusy(false)
        }
      }}
      style={{
        width: '100%',
        padding: '0 16px',
        height: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        background: '#ffffff',
        color: '#1f1f1f',
        border: '1px solid #dadce0',
        borderRadius: 99,
        fontFamily: '"Roboto", "Noto Sans JP", -apple-system, sans-serif',
        fontSize: 14,
        fontWeight: 500,
        letterSpacing: '.005em',
        cursor: busy ? 'wait' : 'pointer',
        boxShadow:
          '0 1px 2px rgba(0,0,0,0.30), 0 1px 3px 1px rgba(0,0,0,0.15)',
        opacity: busy ? 0.7 : 1,
        transition: 'opacity .15s',
      }}
    >
      <GoogleG size={18} />
      <span>{busy ? '接続中…' : 'Googleで続ける'}</span>
    </button>
  )
}

function GoogleG({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.97v2.34A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.98 10.72A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.18.3-1.72V4.94H.97A9 9 0 0 0 0 9c0 1.45.35 2.83.97 4.06l3.01-2.34z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 9 0 9 9 0 0 0 .97 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  )
}

function TermsLink({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: 'transparent',
        border: 'none',
        padding: 0,
        margin: 0,
        color: 'rgba(240,240,245,.92)',
        textDecoration: 'underline',
        textDecorationColor: 'rgba(240,240,245,.55)',
        textUnderlineOffset: 2,
        cursor: 'pointer',
        font: 'inherit',
        letterSpacing: 'inherit',
        lineHeight: 'inherit',
      }}
    >
      {children}
    </button>
  )
}
