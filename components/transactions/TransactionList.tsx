'use client'

import { useOptimistic, useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TrendingUp } from 'lucide-react'
import { getCategoryIcon } from '@/lib/category-icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { CsvImportDialog } from '@/components/transactions/CsvImportDialog'
import { createTransaction, type TransactionFormState } from '@/app/actions/transactions'
import type { Transaction, Category } from '@/lib/types'
import { DEFAULT_CATEGORY_COLORS } from '@/lib/types'

const today = () => new Date().toISOString().split('T')[0]

function categoryColor(tx: Transaction): string {
  if (tx.categories?.color) return tx.categories.color
  if (tx.categories?.name) return DEFAULT_CATEGORY_COLORS[tx.categories.name] ?? '#8b8ba0'
  return tx.amount >= 0 ? '#4ade80' : '#fb7185'
}

function categoryLabel(tx: Transaction): string {
  return tx.categories?.name ?? (tx.amount >= 0 ? '収入' : '支出')
}

function groupByDate(transactions: Transaction[]) {
  const groups: Record<string, Transaction[]> = {}
  for (const tx of transactions) {
    const key = tx.occurred_on
    if (!groups[key]) groups[key] = []
    groups[key].push(tx)
  }
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 10) // show last 10 days
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diff = Math.floor((today.getTime() - d.getTime()) / 86400000)
  const dows = ['日', '月', '火', '水', '木', '金', '土']
  const dow = dows[d.getDay()]
  const base = `${d.getMonth() + 1}月${d.getDate()}日 · ${dow}`
  if (diff === 0) return `今日 · ${base}`
  if (diff === 1) return `昨日 · ${base}`
  return base
}

interface Props {
  initial: Transaction[]
  categories: Category[]
  uncategorizedCount?: number
}

export function TransactionList({ initial, categories, uncategorizedCount = 0 }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [fieldErrors, setFieldErrors] = useState<TransactionFormState>({})

  const [optimisticItems, addOptimistic] = useOptimistic(
    initial,
    (state: Transaction[], newItem: Transaction) => [newItem, ...state]
  )

  const [amount, setAmount] = useState('')
  const [payee, setPayee] = useState('')
  const [occurred_on, setOccurredOn] = useState(today())
  const [isIncome, setIsIncome] = useState(false)
  const [categoryId, setCategoryId] = useState<string>('')

  function resetForm() {
    setAmount('')
    setPayee('')
    setOccurredOn(today())
    setIsIncome(false)
    setCategoryId('')
    setFieldErrors({})
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const parsedAmount = parseInt(amount, 10)
    if (!payee.trim() || !parsedAmount || !occurred_on) return

    const finalAmount = isIncome ? Math.abs(parsedAmount) : -Math.abs(parsedAmount)
    const formData = new FormData()
    formData.set('amount', String(finalAmount))
    formData.set('payee', payee.trim())
    formData.set('occurred_on', occurred_on)
    if (categoryId) formData.set('category_id', categoryId)

    const cat = categories.find((c) => c.id === categoryId)
    const optimistic: Transaction = {
      id: crypto.randomUUID(),
      household_id: '',
      amount: finalAmount,
      payee: payee.trim(),
      occurred_on,
      category_id: categoryId || null,
      is_fixed: false,
      source: 'manual',
      source_hash: null,
      created_at: new Date().toISOString(),
      categories: cat ? { name: cat.name, color: cat.color, icon: cat.icon } : null,
    }

    startTransition(async () => {
      addOptimistic(optimistic)
      setOpen(false)
      resetForm()
      const result = await createTransaction({}, formData)
      if (!result.success) {
        setFieldErrors(result)
        if (result.errors || result.message) setOpen(true)
      }
    })
  }

  const groups = groupByDate(optimisticItems)
  const BAD_NAMES = ['未分類', 'その他', '不明']
  const hasUncategorized = uncategorizedCount > 0
    || optimisticItems.some((t) => !t.category_id || BAD_NAMES.includes(t.categories?.name ?? ''))
  const [classifying, setClassifying] = useState(false)
  const [classifyResult, setClassifyResult] = useState<{ classified: number; total: number } | null>(null)

  async function handleReclassify() {
    setClassifying(true)
    setClassifyResult(null)
    try {
      const res = await fetch('/api/transactions/classify', { method: 'POST' })
      const data = await res.json() as { classified: number; total: number }
      setClassifyResult(data)
      router.refresh()
    } finally {
      setClassifying(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <p className="lbl">取引履歴</p>
        <div className="flex items-center gap-2">
          {hasUncategorized && (
            <button
              onClick={handleReclassify}
              disabled={classifying}
              className="flex items-center gap-1.5 rounded-[10px] border border-[#fbbf24]/20 bg-[#fbbf24]/8 px-3 py-2 text-[12px] font-medium text-[#fbbf24] transition-colors hover:bg-[#fbbf24]/15 disabled:opacity-50"
            >
              {classifying
                ? '分類中…'
                : classifyResult
                  ? `${classifyResult.classified}/${classifyResult.total}件 分類完了`
                  : `未分類 ${uncategorizedCount}件を一括再分類`}
            </button>
          )}
          <CsvImportDialog onImported={() => router.refresh()} />
          <Dialog
            open={open}
            onOpenChange={(next) => { setOpen(next); if (!next) resetForm() }}
          >
            <DialogTrigger
              render={
                <button
                  className="mono min-h-[44px] rounded-[10px] px-4 py-2.5 text-[13px] font-bold text-[#0a0a10]"
                  style={{
                    background: 'linear-gradient(135deg,#5eead4,#22d3ee)',
                    boxShadow: '0 4px 18px rgba(94,234,212,0.28)',
                    border: 'none',
                  }}
                />
              }
            >
              ＋ 追加
            </DialogTrigger>

            <DialogContent className="bg-[#14161f] border-white/10 text-[#f0f0f5] sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-[#f0f0f5]">取引を登録</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="grid gap-4 pt-2">
                <div className="grid gap-1.5">
                  <Label className="text-[#8b8ba0] text-xs">種別</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[false, true].map((inc) => (
                      <button
                        key={String(inc)}
                        type="button"
                        onClick={() => setIsIncome(inc)}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                          isIncome === inc
                            ? inc
                              ? 'border-[#4ade80]/40 bg-[#4ade80]/10 text-[#4ade80]'
                              : 'border-[#fb7185]/40 bg-[#fb7185]/10 text-[#fb7185]'
                            : 'border-white/10 text-[#8b8ba0] hover:border-white/20'
                        }`}
                      >
                        {inc ? '収入' : '支出'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="occurred_on" className="text-[#8b8ba0] text-xs">日付</Label>
                  <Input
                    id="occurred_on"
                    type="date"
                    value={occurred_on}
                    onChange={(e) => setOccurredOn(e.target.value)}
                    required
                    className="bg-[#0a0a10] border-white/10 text-[#f0f0f5] focus-visible:border-[#5eead4]/50 focus-visible:ring-[#5eead4]/20"
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="amount" className="text-[#8b8ba0] text-xs">金額（円）</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="bg-[#0a0a10] border-white/10 text-[#f0f0f5] placeholder:text-[#5e5e72] focus-visible:border-[#5eead4]/50 focus-visible:ring-[#5eead4]/20"
                  />
                  {fieldErrors.errors?.amount && (
                    <p className="text-xs text-[#fb7185]">{fieldErrors.errors.amount[0]}</p>
                  )}
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-[#8b8ba0] text-xs">カテゴリ</Label>
                  <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? '')}>
                    <SelectTrigger className="w-full bg-[#0a0a10] border-white/10 text-[#f0f0f5] focus-visible:border-[#5eead4]/50">
                      <SelectValue placeholder="選択なし" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#14161f] border-white/10 text-[#f0f0f5]">
                      {categories.map((cat) => (
                        <SelectItem
                          key={cat.id}
                          value={cat.id}
                          className="focus:bg-white/5 focus:text-[#f0f0f5]"
                        >
                          <span className="flex items-center gap-2">
                            {cat.icon && <span>{cat.icon}</span>}
                            {cat.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="payee" className="text-[#8b8ba0] text-xs">支払先</Label>
                  <Input
                    id="payee"
                    type="text"
                    placeholder="例：セブンイレブン、電車代…"
                    maxLength={100}
                    value={payee}
                    onChange={(e) => setPayee(e.target.value)}
                    required
                    className="bg-[#0a0a10] border-white/10 text-[#f0f0f5] placeholder:text-[#5e5e72] focus-visible:border-[#5eead4]/50 focus-visible:ring-[#5eead4]/20"
                  />
                  {fieldErrors.errors?.payee && (
                    <p className="text-xs text-[#fb7185]">{fieldErrors.errors.payee[0]}</p>
                  )}
                </div>

                {fieldErrors.message && (
                  <p className="rounded-lg border border-[#fb7185]/20 bg-[#fb7185]/5 px-3 py-2 text-xs text-[#fb7185]">
                    {fieldErrors.message}
                  </p>
                )}

                <DialogFooter className="border-white/10 bg-transparent -mx-4 -mb-4 px-4 pb-4 pt-2">
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="w-full bg-[#5eead4] text-[#0a0a10] font-semibold hover:bg-[#5eead4]/90 disabled:opacity-50"
                  >
                    {isPending ? '保存中…' : '登録する'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Date-grouped list */}
      {optimisticItems.length === 0 ? (
        <div
          className="rounded-[18px] px-4 py-8 text-center text-sm text-[#5e5e72]"
          style={{ background: 'rgba(20,22,32,0.66)', border: '1px solid rgba(255,255,255,0.10)' }}
        >
          取引がありません。「追加」ボタンから登録してください。
        </div>
      ) : (
        groups.map(([date, txs], gi) => {
          const dayTotal = txs.reduce((s, t) => s + t.amount, 0)
          return (
            <div key={date} className="mb-3.5 reveal-up" style={{ animationDelay: `${gi * 50}ms` }}>
              <div className="flex items-center justify-between px-1 py-2">
                <p className="text-[12px] font-bold tracking-[0.04em] text-[#8b8ba0]">
                  {formatDateLabel(date)}
                </p>
                <p
                  className="mono text-[12px] font-semibold"
                  style={{ color: dayTotal >= 0 ? '#4ade80' : '#8b8ba0' }}
                >
                  {dayTotal >= 0 ? '+' : ''}¥{Math.abs(dayTotal).toLocaleString()}
                </p>
              </div>

              <div
                className="rounded-[18px] px-3 py-1"
                style={{ background: 'rgba(20,22,32,0.66)', backdropFilter: 'blur(24px) saturate(160%)', border: '1px solid rgba(255,255,255,0.10)' }}
              >
                {txs.map((tx, i) => {
                  const color = categoryColor(tx)
                  return (
                    <div
                      key={tx.id}
                      className="flex min-h-[48px] cursor-pointer items-center gap-3 py-3.5"
                      style={{ borderBottom: i < txs.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}
                    >
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] text-[15px]"
                        style={{
                          background: tx.amount >= 0 ? 'rgba(74,222,128,0.10)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${tx.amount >= 0 ? 'rgba(74,222,128,0.25)' : 'rgba(255,255,255,0.10)'}`,
                          color: tx.amount >= 0 ? '#4ade80' : color,
                        }}
                      >
                        {tx.amount >= 0
                          ? <TrendingUp className="size-4" />
                          : (() => { const I = getCategoryIcon(tx.categories?.name ?? ''); return <I className="size-4" /> })()
                        }
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-medium text-[#f0f0f5]">{tx.payee}</p>
                        <p className="mono mt-0.5 text-[12px] text-[#8b8ba0]">
                          {categoryLabel(tx)}
                          {tx.source === 'csv' && (
                            <span className="ml-1.5 rounded bg-[#a78bfa]/10 px-1 py-px text-[10px] text-[#a78bfa]">CSV</span>
                          )}
                          {tx.source === 'auto' && (
                            <span className="ml-1.5 rounded bg-[#22d3ee]/10 px-1 py-px text-[10px] text-[#22d3ee]">自動</span>
                          )}
                        </p>
                      </div>
                      <span
                        className="mono text-[15px] font-semibold"
                        style={{ color: tx.amount >= 0 ? '#4ade80' : '#f0f0f5' }}
                      >
                        {tx.amount >= 0 ? '+' : ''}¥{Math.abs(tx.amount).toLocaleString()}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
