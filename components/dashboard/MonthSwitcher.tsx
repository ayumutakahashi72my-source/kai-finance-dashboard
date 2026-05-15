'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

function monthOffset(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return `${y}年${m}月`
}

export function MonthSwitcher({ currentMonth }: { currentMonth: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const navigate = (ym: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('month', ym)
    router.push(`/?${params.toString()}`)
  }

  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const isCurrentMonth = currentMonth === thisMonth

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => navigate(monthOffset(currentMonth, -1))}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-[#8b8ba0] transition-colors hover:bg-white/10 hover:text-[#f0f0f5]"
        aria-label="前月"
      >
        <ChevronLeftIcon className="size-4" />
      </button>
      <span className="min-w-[7rem] text-center text-sm font-medium text-[#f0f0f5]">
        {formatLabel(currentMonth)}
      </span>
      <button
        onClick={() => navigate(monthOffset(currentMonth, 1))}
        disabled={isCurrentMonth}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-[#8b8ba0] transition-colors hover:bg-white/10 hover:text-[#f0f0f5] disabled:cursor-not-allowed disabled:opacity-30"
        aria-label="翌月"
      >
        <ChevronRightIcon className="size-4" />
      </button>
      {!isCurrentMonth && (
        <button
          onClick={() => navigate(thisMonth)}
          className="rounded-md px-2 py-0.5 text-xs text-[#5eead4] transition-colors hover:bg-[#5eead4]/10"
        >
          今月
        </button>
      )}
    </div>
  )
}
