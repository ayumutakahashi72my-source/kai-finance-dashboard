'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, PieChart, CalendarDays, Tag, Settings, type LucideIcon } from 'lucide-react'

const NAV: { href: string; icon: LucideIcon; label: string }[] = [
  { href: '/',           icon: LayoutDashboard, label: 'ダッシュボード' },
  { href: '/budget',     icon: PieChart,        label: '予算' },
  { href: '/calendar',   icon: CalendarDays,    label: 'カレンダー' },
  { href: '/categories', icon: Tag,             label: 'カテゴリ管理' },
  { href: '/settings',   icon: Settings,        label: '設定' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="fixed left-0 top-0 z-40 hidden h-screen w-[220px] flex-col border-r border-white/10 bg-[rgba(8,8,14,0.75)] backdrop-blur-[24px] lg:flex">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-white/10 px-[18px] py-[22px]">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-[11px]"
          style={{
            background: 'linear-gradient(135deg,#5eead4,#22d3ee)',
            boxShadow: '0 0 18px rgba(94,234,212,0.28)',
          }}
        >
          <span className="mono text-[15px] font-black text-[#0a0a10]">K</span>
        </div>
        <div>
          <p className="mono text-sm font-bold tracking-[0.04em] text-[#f0f0f5]">KAKEIBO AI</p>
          <p className="mono text-[11px] text-[#8b8ba0] tracking-[0.06em]">v0.1 · BETA</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2.5">
        {NAV.map((n) => {
          const active = pathname === n.href
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active ? 'page' : undefined}
              className="relative flex min-h-[44px] items-center gap-3 rounded-[11px] px-3.5 py-3 text-sm font-medium transition-all"
              style={{
                color: active ? '#5eead4' : '#c4c4d0',
                background: active ? 'rgba(94,234,212,0.08)' : 'transparent',
              }}
            >
              {active && (
                <span
                  className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full"
                  style={{ background: '#5eead4', boxShadow: '0 0 12px rgba(94,234,212,0.28)' }}
                />
              )}
              <n.icon className="size-[18px] shrink-0" />
              {n.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 p-3.5">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-[11px] border border-white/16"
            style={{ background: 'linear-gradient(135deg,rgba(167,139,250,0.4),rgba(94,234,212,0.3))' }}
          >
            <span className="text-sm font-bold text-[#f0f0f5]">家</span>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[#f0f0f5]">マイホーム</p>
            <p className="mono text-[11px] tracking-[0.04em] text-[#8b8ba0]">HOUSEHOLD</p>
          </div>
        </div>
      </div>
    </div>
  )
}
