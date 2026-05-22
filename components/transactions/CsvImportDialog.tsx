'use client'

import { useState, useRef, useEffect } from 'react'
import { UploadIcon, FileTextIcon, CheckCircleIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { parseMfCsv, decodeCsvBuffer } from '@/lib/csv-parser'
import { SyncLoading } from '@/components/kai/SyncLoading'

interface ImportResult {
  inserted: number
  skipped: number
  classified: number
  categoriesCreated: number
  parseErrors: string[]
}

export function CsvImportDialog({ onImported, defaultOpen = false }: { onImported?: () => void; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<{ count: number; errors: string[] } | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // インポート中: 0→90% を疑似シミュレート（完了で 1.0 にジャンプ）
  useEffect(() => {
    if (loading) {
      setLoadProgress(0)
      const total = preview?.count ?? 20
      const stepMs = Math.max(120, Math.min(600, (total * 30)))
      progressRef.current = setInterval(() => {
        setLoadProgress((p) => {
          const next = p + (0.9 - p) * 0.18
          return next > 0.88 ? 0.88 : next
        })
      }, stepMs)
    } else {
      if (progressRef.current) clearInterval(progressRef.current)
      if (result) {
        setLoadProgress(1)
        const t = setTimeout(() => setLoadProgress(0), 600)
        return () => clearTimeout(t)
      }
    }
    return () => { if (progressRef.current) clearInterval(progressRef.current) }
  }, [loading, result, preview?.count])

  function reset() {
    setFile(null)
    setPreview(null)
    setResult(null)
    setLoadProgress(0)
  }

  async function handleFile(f: File) {
    setFile(f)
    setResult(null)
    const buffer = await f.arrayBuffer()
    const text = decodeCsvBuffer(buffer)
    const { rows, errors } = parseMfCsv(text)
    setPreview({ count: rows.length, errors })
  }

  async function handleImport() {
    if (!file) return
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/transactions/import/csv', { method: 'POST', body: fd })
      const data = await res.json() as ImportResult & { error?: string }
      if (data.error) {
        setPreview((p) => p ? { ...p, errors: [data.error!, ...(p.errors ?? [])] } : null)
      } else {
        setResult(data)
        onImported?.()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* CSV インポート中のフルスクリーンロード */}
      {loading && (
        <SyncLoading
          progress={loadProgress}
          statusLabel="CSV · 取込み中"
          transactions={[]}
        />
      )}

    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger
        render={
          <Button
            size="sm"
            className="gap-1.5 bg-[#a78bfa]/10 text-[#a78bfa] hover:bg-[#a78bfa]/20 border border-[#a78bfa]/20"
          />
        }
      >
        <UploadIcon className="size-3.5" />
        CSV
      </DialogTrigger>

      <DialogContent className="bg-[#14161f] border-white/10 text-[#f0f0f5] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#f0f0f5]">CSVインポート</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-[#8b8ba0]">
          マネーフォワードMeからエクスポートしたCSVファイルを選択してください。
        </p>

        {/* ドロップゾーン */}
        {!result && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              const f = e.dataTransfer.files[0]
              if (f) handleFile(f)
            }}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 transition-colors ${
              dragOver
                ? 'border-[#a78bfa]/60 bg-[#a78bfa]/10'
                : 'border-white/10 hover:border-[#a78bfa]/40 hover:bg-[#a78bfa]/5'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
              }}
            />
            {file ? (
              <>
                <FileTextIcon className="size-8 text-[#a78bfa]" />
                <p className="text-sm font-medium text-[#f0f0f5]">{file.name}</p>
                {preview && (
                  <p className="text-xs text-[#8b8ba0]">
                    {preview.count}件の取引を検出
                  </p>
                )}
              </>
            ) : (
              <>
                <UploadIcon className="size-8 text-[#5e5e72]" />
                <p className="text-sm text-[#8b8ba0]">ここにCSVをドロップ、またはクリック</p>
              </>
            )}
          </div>
        )}

        {/* パースエラー */}
        {preview?.errors && preview.errors.length > 0 && (
          <div className="rounded-lg border border-[#fbbf24]/20 bg-[#fbbf24]/5 px-3 py-2">
            <p className="mb-1 text-xs font-medium text-[#fbbf24]">警告</p>
            <ul className="space-y-0.5">
              {preview.errors.slice(0, 5).map((e, i) => (
                <li key={i} className="text-xs text-[#fbbf24]/80">{e}</li>
              ))}
              {preview.errors.length > 5 && (
                <li className="text-xs text-[#fbbf24]/60">…他 {preview.errors.length - 5} 件</li>
              )}
            </ul>
          </div>
        )}

        {/* 完了 */}
        {result && (
          <div className="space-y-2">
            <div className="rounded-xl border border-[#4ade80]/20 bg-[#4ade80]/5 px-4 py-5 text-center">
              <CheckCircleIcon className="mx-auto mb-2 size-8 text-[#4ade80]" />
              <p className="font-semibold text-[#4ade80]">インポート完了</p>
              <p className="mt-1 text-sm text-[#8b8ba0]">
                新規追加: <span className="text-[#f0f0f5]">{result.inserted}件</span>
                　スキップ: <span className="text-[#f0f0f5]">{result.skipped}件</span>
              </p>
              <p className="mt-0.5 text-xs text-[#8b8ba0]">
                カテゴリ分類: <span className="text-[#fb9477]">{result.classified}件</span>
                {result.categoriesCreated > 0 && (
                  <span className="ml-2 text-[#a78bfa]">（{result.categoriesCreated}カテゴリを自動作成）</span>
                )}
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="border-white/10 -mx-4 -mb-4 px-4 pb-4 pt-2">
          {result ? (
            <Button
              onClick={() => setOpen(false)}
              className="w-full bg-[#fb9477] text-[#0a0a10] font-semibold hover:bg-[#fb9477]/90"
            >
              閉じる
            </Button>
          ) : (
            <Button
              onClick={handleImport}
              disabled={!file || !preview || preview.count === 0 || loading}
              className="w-full bg-[#a78bfa] text-[#0a0a10] font-semibold hover:bg-[#a78bfa]/90 disabled:opacity-40"
            >
              {loading ? 'インポート中…' : `${preview?.count ?? 0}件をインポート`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
