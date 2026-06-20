'use client'

import { useState, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { KAI } from '@/lib/kai-tokens'
import { Icon, KaiSystemBrand } from '@/components/kai/shared'
import { ThemeToggle } from '@/components/kai/ThemeToggle'
import { AddPickerSheet } from '@/components/layout/AddPickerSheet'
import { SIDEBAR_NAV, isNavActive } from '@/lib/nav'

const CORAL = KAI.coral
const CORAL_SOFT = 'rgba(251,148,119,0.10)'

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [pickerOpen, setPickerOpen] = useState(false)

  const handlePickerDone = useCallback(() => {
    setPickerOpen(false)
    router.push('/')
  }, [router])

  return (
    <>
      <AddPickerSheet open={pickerOpen} onClose={() => setPickerOpen(false)} onDone={handlePickerDone} />
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[220px] flex-col lg:flex"
      style={{
        background: 'var(--kai-bg-sidebar)',
        backdropFilter: 'blur(24px)',
        borderRight: `1px solid ${KAI.border2}`,
      }}
    >
      {/* Brand */}
      <div style={{ padding: '20px 16px', borderBottom: `1px solid ${KAI.border2}` }}>
        <KaiSystemBrand size="md" />
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: 10 }}>
        {SIDEBAR_NAV.map((n, i) => {
          const active = isNavActive(n.href, pathname)
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active ? 'page' : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 14px', borderRadius: 11,
                fontSize: 14, fontWeight: 500, textDecoration: 'none',
                color: active ? CORAL : KAI.text2,
                background: active ? CORAL_SOFT : 'transparent',
                position: 'relative',
                animation: `kai-rise .5s ${50 * i}ms both ease-out`,
              }}
            >
              {active && (
                <span style={{
                  position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                  width: 3, height: 20, background: CORAL, borderRadius: 99,
                  boxShadow: `0 0 12px ${CORAL}55`,
                }}/>
              )}
              <Icon name={n.icon} size={18}/>
              {n.label}
            </Link>
          )
        })}
      </nav>

      {/* 取り込みボタン */}
      <div style={{ padding: '0 10px 10px' }}>
        <button
          onClick={() => setPickerOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            width: '100%', padding: '11px 14px', borderRadius: 11,
            background: `linear-gradient(135deg, ${CORAL} 0%, ${KAI.blue} 100%)`,
            border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 14, fontWeight: 700, color: KAI.bg,
            boxShadow: `0 6px 20px ${CORAL}44`,
          }}
        >
          <Icon name="plus" size={18} stroke={2.4}/>
          取り込む
        </button>
      </div>

      {/* Settings */}
      <div style={{ padding: '0 10px 6px' }}>
        <Link
          href="/settings"
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 14px', borderRadius: 11,
            fontSize: 14, fontWeight: 500, textDecoration: 'none',
            color: pathname.startsWith('/settings') ? CORAL : KAI.text2,
            background: pathname.startsWith('/settings') ? CORAL_SOFT : 'transparent',
            animation: 'kai-rise .5s 250ms both ease-out',
          }}
        >
          <Icon name="settings" size={18}/>
          設定
        </Link>
      </div>

      {/* Footer — household badge + theme toggle */}
      <div style={{ borderTop: `1px solid ${KAI.border2}`, padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 11,
            background: `linear-gradient(135deg, rgba(251,148,119,0.35), rgba(122,167,255,0.25))`,
            border: `1px solid ${KAI.borderStrong}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, color: KAI.text1,
          }}>家</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: KAI.text1 }}>マイホーム</p>
            <p style={{ margin: 0, fontSize: 11, color: KAI.text3, fontFamily: 'var(--font-jetbrains), JetBrains Mono, monospace', letterSpacing: '.04em' }}>HOUSEHOLD</p>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </aside>
    </>
  )
}
