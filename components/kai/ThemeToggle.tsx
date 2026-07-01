'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { KAI } from '@/lib/kai-tokens'

export function ThemeToggle() {
  // resolvedTheme を使うことで、"system" 保存済みの古いユーザーでも
  // 実際に適用中の見た目を正しく判定できる（theme のままだと system 時に誤判定していた）。
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div style={{ width: 36, height: 36 }} />

  const isDark = resolvedTheme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'ライトモードに切替' : 'ダークモードに切替'}
      title={isDark ? 'ライトモードに切替' : 'ダークモードに切替'}
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        border: `1px solid ${KAI.border2}`,
        background: KAI.bgPanel,
        color: KAI.text3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'color .2s, background .2s, border-color .2s',
      }}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}

function SunIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden>
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  )
}
