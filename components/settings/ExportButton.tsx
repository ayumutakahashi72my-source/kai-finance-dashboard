'use client'

import { useState } from 'react'
import { DownloadIcon } from 'lucide-react'

type Period = 'this-month' | 'last-month' | 'all'

function monthStr(offset: number): string {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const OPTIONS: { value: Period; label: string }[] = [
  { value: 'this-month', label: '今月' },
  { value: 'last-month', label: '先月' },
  { value: 'all', label: '全期間' },
]

export function ExportButton() {
  const [open, setOpen] = useState(false)
  const [period, setPeriod] = useState<Period>('this-month')
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)
    try {
      const qs = period === 'all' ? '' : `?month=${period === 'this-month' ? monthStr(0) : monthStr(-1)}`
      const res = await fetch(`/api/transactions/export${qs}`)
      if (!res.ok) throw new Error('エクスポートに失敗しました')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const suffix = period === 'all' ? 'all' : period === 'this-month' ? monthStr(0) : monthStr(-1)
      a.download = `kai_transactions_${suffix}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setOpen(false)
    } catch {
      alert('エクスポートに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-[var(--kai-overlay-weak)] active:bg-[var(--kai-border)]"
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
      >
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
          style={{ background: 'var(--kai-overlay-weak)' }}
        >
          <DownloadIcon className="size-[17px]" style={{ color: 'var(--kai-text2)' }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-medium leading-snug" style={{ color: 'var(--kai-text1)' }}>
            データをエクスポート
          </p>
          <p className="mt-0.5 text-[11.5px] leading-snug" style={{ color: 'var(--kai-text4)' }}>
            取引データをCSVでダウンロード（期間を選択）
          </p>
        </div>
        <svg
          className="size-[15px] shrink-0 transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}
          viewBox="0 0 24 24" fill="none" stroke="var(--kai-text5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4">
          <div className="flex gap-2">
            {OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setPeriod(o.value)}
                className="flex-1 rounded-[10px] px-3 py-2 text-[12.5px] font-medium transition-colors"
                style={{
                  background: period === o.value ? 'var(--kai-border2)' : 'var(--kai-overlay-weak)',
                  border: `1px solid ${period === o.value ? 'var(--kai-border-strong)' : 'var(--kai-border)'}`,
                  color: period === o.value ? 'var(--kai-text1)' : 'var(--kai-text3)',
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={loading}
            className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-[10px] px-3 py-2.5 text-[13px] font-semibold transition-opacity hover:opacity-85 disabled:cursor-wait disabled:opacity-50"
            style={{ background: 'var(--kai-btn-sec-bg)', border: '1px solid var(--kai-btn-sec-border)', color: 'var(--kai-text1)' }}
          >
            <DownloadIcon className="size-[14px]" />
            {loading ? 'ダウンロード中…' : 'ダウンロード'}
          </button>
        </div>
      )}
    </div>
  )
}
