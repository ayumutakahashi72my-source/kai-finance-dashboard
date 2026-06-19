'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { KAI } from '@/lib/kai-tokens'
import { Icon } from '@/components/kai/shared'
import { AddPickerSheet } from '@/components/layout/AddPickerSheet'

const CORAL = KAI.coral
const BLUE  = KAI.blue

import type { IconName } from '@/components/kai/shared'

const LEFT_NAV: { href: string; icon: IconName; label: string }[] = [
  { href: '/',         icon: 'grid',     label: 'ホーム' },
  { href: '/calendar', icon: 'calendar', label: 'カレンダー' },
]
const RIGHT_NAV: { href: string; icon: IconName; label: string }[] = [
  { href: '/transactions', icon: 'pie', label: '収支' },
  { href: '/summary',      icon: 'msg', label: 'AI' },
]

export function BottomBar() {
  const pathname = usePathname()
  const [pickerOpen, setPickerOpen] = useState(false)

  return (
    <>
      <AddPickerSheet open={pickerOpen} onClose={() => setPickerOpen(false)} />

      <div
        className="fixed bottom-0 left-0 right-0 z-40 pt-2 lg:hidden"
        style={{ background: 'linear-gradient(180deg, transparent, rgba(10,10,16,0.92) 30%)', paddingBottom: 'calc(env(safe-area-inset-bottom, 16px) + 8px)' }}
      >
        <div
          className="relative mx-3.5 flex items-center rounded-[24px] px-3 py-2"
          style={{
            background: KAI.bottombarBg,
            backdropFilter: 'blur(20px) saturate(160%)',
            border: `1px solid ${KAI.borderStrong}`,
            boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
          }}
        >
          {/* Left items — flex-1 so both sides are equal width */}
          <div className="flex flex-1 items-center justify-around">
            {LEFT_NAV.map((it) => {
              const active = pathname === it.href
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  aria-label={it.label}
                  aria-current={active ? 'page' : undefined}
                  className="flex min-h-[48px] flex-col items-center gap-[3px] px-2 py-2"
                  style={{ color: active ? CORAL : KAI.text3, textDecoration: 'none' }}
                >
                  <Icon name={it.icon} size={20}/>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{it.label}</span>
                </Link>
              )
            })}
          </div>

          {/* Center FAB spacer */}
          <div className="w-[62px] shrink-0" />

          {/* Right items — flex-1 mirrors left */}
          <div className="flex flex-1 items-center justify-around">
            {RIGHT_NAV.map((it) => {
              const active = pathname === it.href
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  aria-label={it.label}
                  aria-current={active ? 'page' : undefined}
                  className="flex min-h-[48px] flex-col items-center gap-[3px] px-2 py-2"
                  style={{ color: active ? CORAL : KAI.text3, textDecoration: 'none' }}
                >
                  <Icon name={it.icon} size={20}/>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{it.label}</span>
                </Link>
              )
            })}
          </div>

          {/* Center FAB */}
          <button
            aria-label="追加"
            onClick={() => setPickerOpen(true)}
            className="absolute left-1/2 -translate-x-1/2 -translate-y-[14px] flex h-[54px] w-[54px] items-center justify-center rounded-full border-[3px]"
            style={{
              background: `linear-gradient(135deg, ${CORAL} 0%, ${BLUE} 100%)`,
              borderColor: KAI.bg,
              color: KAI.bg,
              boxShadow: `0 8px 24px ${CORAL}55`,
              animation: 'kai-pulse-coral 2.4s ease-in-out infinite',
            }}
          >
            <Icon name="plus" size={22} stroke={2.4}/>
          </button>
        </div>
      </div>
    </>
  )
}
