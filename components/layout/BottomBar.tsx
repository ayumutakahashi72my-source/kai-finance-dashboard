'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, PieChart, Settings, type LucideIcon } from 'lucide-react'

const NAV: { href: string; icon: LucideIcon; label: string }[] = [
  { href: '/',         icon: LayoutDashboard, label: 'ホーム' },
  { href: '/budget',   icon: PieChart,        label: '予算' },
  { href: '/settings', icon: Settings,        label: '設定' },
]

export function BottomBar() {
  const pathname = usePathname()

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 pb-6 pt-2 lg:hidden"
      style={{ background: 'linear-gradient(180deg, transparent, rgba(10,10,16,0.92) 30%)' }}
    >
      <div
        className="mx-3.5 flex items-center justify-around rounded-[22px] px-3 py-2"
        style={{
          background: 'rgba(20,22,32,0.88)',
          backdropFilter: 'blur(20px) saturate(160%)',
          border: '1px solid rgba(255,255,255,0.16)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
        }}
      >
        {NAV.map((it, i) => {
          if (i === 1) {
            return (
              <div key="fab" className="flex items-center justify-center">
                <Link
                  href="/budget"
                  aria-label="予算"
                  className="flex h-[52px] w-[52px] items-center justify-center rounded-[18px] text-[#0a0a10]"
                  style={{
                    background: 'linear-gradient(135deg,#5eead4,#22d3ee)',
                    boxShadow: '0 4px 18px rgba(94,234,212,0.28), inset 0 1px 0 rgba(255,255,255,0.4)',
                    marginTop: -22,
                  }}
                >
                  <PieChart className="size-5" />
                </Link>
                <div className="mx-2 flex min-h-[48px] min-w-[48px] flex-col items-center gap-[3px] bg-transparent p-[8px_10px]" />
              </div>
            )
          }
          const active = pathname === it.href
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-label={it.label}
              aria-current={active ? 'page' : undefined}
              className="flex min-h-[48px] min-w-[48px] flex-col items-center gap-[3px] bg-transparent p-[8px_10px]"
              style={{ color: active ? '#5eead4' : '#8b8ba0' }}
            >
              <it.icon className="size-5" />
              <span className="text-[11px] font-semibold">{it.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
