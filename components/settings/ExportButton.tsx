'use client'

import { useState } from 'react'
import { DownloadIcon } from 'lucide-react'

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function ExportButton() {
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)
    try {
      const month = currentMonth()
      const res = await fetch(`/api/transactions/export?month=${month}`)
      if (!res.ok) throw new Error('エクスポートに失敗しました')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `kai_transactions_${month}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      alert('エクスポートに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={loading}
      className="flex w-full items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-white/[0.04] active:bg-white/[0.06]"
      style={{ background: 'none', border: 'none', cursor: loading ? 'wait' : 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
        style={{ background: 'rgba(255,255,255,.05)' }}
      >
        <DownloadIcon className="size-[17px]" style={{ color: '#c8c8d8' }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-medium leading-snug" style={{ color: '#e8e8f0' }}>
          {loading ? 'ダウンロード中…' : 'データをエクスポート'}
        </p>
        <p className="mt-0.5 text-[11.5px] leading-snug" style={{ color: '#5e5e72' }}>
          今月の取引データをCSVでダウンロード
        </p>
      </div>
      <svg className="size-[15px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="#3a3a50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <path d="M7 10l5 5 5-5" />
        <path d="M12 15V3" />
      </svg>
    </button>
  )
}
