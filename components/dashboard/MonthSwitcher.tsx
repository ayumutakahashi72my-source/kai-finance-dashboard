'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { KAI } from '@/lib/kai-tokens'

function monthOffset(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return `${y}年${m}月`
}

export function MonthSwitcher({ currentMonth, paramName = 'month' }: { currentMonth: string; paramName?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const navigate = (ym: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set(paramName, ym)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const isCurrentMonth = currentMonth === thisMonth

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => navigate(monthOffset(currentMonth, -1))}
        className="flex h-11 w-11 items-center justify-center rounded-xl transition-colors hover:bg-black/5 dark:hover:bg-white/10"
        style={{ color: 'var(--kai-text3)' }}
        aria-label="前月"
      >
        <ChevronLeftIcon className="size-5" />
      </button>
      <span className="min-w-[7rem] text-center text-sm font-medium" style={{ color: 'var(--kai-text1)' }}>
        {formatLabel(currentMonth)}
      </span>
      <button
        onClick={() => navigate(monthOffset(currentMonth, 1))}
        disabled={isCurrentMonth}
        className="flex h-11 w-11 items-center justify-center rounded-xl transition-colors hover:bg-black/5 dark:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
        style={{ color: 'var(--kai-text3)' }}
        aria-label="翌月"
      >
        <ChevronRightIcon className="size-5" />
      </button>
      {!isCurrentMonth && (
        <button
          onClick={() => navigate(thisMonth)}
          className="rounded-md px-2 py-0.5 text-xs transition-colors hover:opacity-70"
          style={{ color: KAI.coral }}
        >
          今月
        </button>
      )}
    </div>
  )
}
