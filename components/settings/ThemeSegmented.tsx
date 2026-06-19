'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { KAI } from '@/lib/kai-tokens'

const OPTIONS = [
  { value: 'light', label: 'ライト' },
  { value: 'dark', label: 'ダーク' },
  { value: 'system', label: 'システム' },
] as const

export function ThemeSegmented() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div style={{ height: 35 }} />

  return (
    <div style={{
      display: 'flex', background: KAI.overlayWeak,
      border: `1px solid ${KAI.border}`, borderRadius: 11, padding: 3, gap: 3,
    }}>
      {OPTIONS.map(o => (
        <button
          key={o.value}
          onClick={() => setTheme(o.value)}
          style={{
            flex: 1, border: 'none', borderRadius: 8, padding: '7px 4px',
            fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            background: theme === o.value ? KAI.border2 : 'transparent',
            color: theme === o.value ? KAI.text1 : KAI.text3,
            boxShadow: theme === o.value ? '0 1px 2px rgba(0,0,0,.3)' : 'none',
            transition: 'all .15s',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
