'use client'

import { useOptimistic, useTransition, useState } from 'react'
import { PlusIcon, TrendingDownIcon, TrendingUpIcon } from 'lucide-react'
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
import { createTransaction, type TransactionFormState } from '@/app/actions/transactions'
import {
  type Transaction,
  type TransactionCategory,
  type TransactionType,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
} from '@/lib/types'

const today = () => new Date().toISOString().split('T')[0]

export function TransactionList({ initial }: { initial: Transaction[] }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [fieldErrors, setFieldErrors] = useState<TransactionFormState>({})

  const [optimisticItems, addOptimistic] = useOptimistic(
    initial,
    (state: Transaction[], newItem: Transaction) => [newItem, ...state]
  )

  const [category, setCategory] = useState<TransactionCategory>('food')
  const [type, setType] = useState<TransactionType>('expense')
  const [date, setDate] = useState(today())
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')

  const totalExpense = optimisticItems
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)
  const totalIncome = optimisticItems
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)

  function resetForm() {
    setCategory('food')
    setType('expense')
    setDate(today())
    setAmount('')
    setDescription('')
    setFieldErrors({})
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const parsedAmount = parseFloat(amount)
    if (!description.trim() || !parsedAmount || !date) return

    const formData = new FormData()
    formData.set('amount', String(parsedAmount))
    formData.set('description', description.trim())
    formData.set('category', category)
    formData.set('type', type)
    formData.set('date', date)

    const optimistic: Transaction = {
      id: crypto.randomUUID(),
      user_id: '',
      amount: parsedAmount,
      description: description.trim(),
      category,
      type,
      date,
      created_at: new Date().toISOString(),
    }

    startTransition(async () => {
      addOptimistic(optimistic)
      setOpen(false)
      resetForm()

      const result = await createTransaction({}, formData)
      if (!result.success) {
        setFieldErrors(result)
        // エラーがあればダイアログを再び開く
        if (result.errors || result.message) {
          setOpen(true)
        }
      }
    })
  }

  return (
    <div className="mt-4 rounded-[18px] border border-white/10 bg-[rgba(20,22,32,0.66)] backdrop-blur-[24px]">
      {/* サマリー */}
      <div className="grid grid-cols-2 gap-px border-b border-white/10">
        <div className="p-4">
          <p className="flex items-center gap-1.5 text-xs text-[#8b8ba0]">
            <TrendingDownIcon className="size-3.5 text-[#fb7185]" />
            支出
          </p>
          <p className="mt-1 font-mono text-lg font-semibold text-[#fb7185]">
            ¥{totalExpense.toLocaleString()}
          </p>
        </div>
        <div className="p-4">
          <p className="flex items-center gap-1.5 text-xs text-[#8b8ba0]">
            <TrendingUpIcon className="size-3.5 text-[#4ade80]" />
            収入
          </p>
          <p className="mt-1 font-mono text-lg font-semibold text-[#4ade80]">
            ¥{totalIncome.toLocaleString()}
          </p>
        </div>
      </div>

      {/* ヘッダー + 追加ボタン */}
      <div className="flex items-center justify-between p-4 pb-2">
        <p className="text-sm font-medium text-[#c4c4d0]">取引履歴</p>
        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next)
            if (!next) resetForm()
          }}
        >
          <DialogTrigger
            render={
              <Button
                size="sm"
                className="gap-1.5 bg-[#5eead4]/10 text-[#5eead4] hover:bg-[#5eead4]/20 border border-[#5eead4]/20"
              />
            }
          >
            <PlusIcon className="size-3.5" />
            追加
          </DialogTrigger>

          <DialogContent className="bg-[#14161f] border-white/10 text-[#f0f0f5] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-[#f0f0f5]">取引を登録</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="grid gap-4 pt-2">
              {/* 種別 */}
              <div className="grid gap-1.5">
                <Label className="text-[#8b8ba0] text-xs">種別</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(['expense', 'income'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        type === t
                          ? t === 'expense'
                            ? 'border-[#fb7185]/40 bg-[#fb7185]/10 text-[#fb7185]'
                            : 'border-[#4ade80]/40 bg-[#4ade80]/10 text-[#4ade80]'
                          : 'border-white/10 text-[#8b8ba0] hover:border-white/20'
                      }`}
                    >
                      {t === 'expense' ? '支出' : '収入'}
                    </button>
                  ))}
                </div>
                {fieldErrors.errors?.type && (
                  <p className="text-xs text-[#fb7185]">{fieldErrors.errors.type[0]}</p>
                )}
              </div>

              {/* 日付 */}
              <div className="grid gap-1.5">
                <Label htmlFor="date" className="text-[#8b8ba0] text-xs">日付</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="bg-[#0a0a10] border-white/10 text-[#f0f0f5] focus-visible:border-[#5eead4]/50 focus-visible:ring-[#5eead4]/20"
                />
                {fieldErrors.errors?.date && (
                  <p className="text-xs text-[#fb7185]">{fieldErrors.errors.date[0]}</p>
                )}
              </div>

              {/* 金額 */}
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

              {/* カテゴリ */}
              <div className="grid gap-1.5">
                <Label className="text-[#8b8ba0] text-xs">カテゴリ</Label>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as TransactionCategory)}
                >
                  <SelectTrigger className="w-full bg-[#0a0a10] border-white/10 text-[#f0f0f5] focus-visible:border-[#5eead4]/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#14161f] border-white/10 text-[#f0f0f5]">
                    {(Object.entries(CATEGORY_LABELS) as [TransactionCategory, string][]).map(
                      ([value, label]) => (
                        <SelectItem
                          key={value}
                          value={value}
                          className="focus:bg-white/5 focus:text-[#f0f0f5]"
                        >
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
                {fieldErrors.errors?.category && (
                  <p className="text-xs text-[#fb7185]">{fieldErrors.errors.category[0]}</p>
                )}
              </div>

              {/* 説明 */}
              <div className="grid gap-1.5">
                <Label htmlFor="description" className="text-[#8b8ba0] text-xs">説明</Label>
                <Input
                  id="description"
                  type="text"
                  placeholder="例：コンビニ、電車代…"
                  maxLength={100}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="bg-[#0a0a10] border-white/10 text-[#f0f0f5] placeholder:text-[#5e5e72] focus-visible:border-[#5eead4]/50 focus-visible:ring-[#5eead4]/20"
                />
                {fieldErrors.errors?.description && (
                  <p className="text-xs text-[#fb7185]">
                    {fieldErrors.errors.description[0]}
                  </p>
                )}
              </div>

              {fieldErrors.message && (
                <p className="text-xs text-[#fb7185] rounded-lg border border-[#fb7185]/20 bg-[#fb7185]/5 px-3 py-2">
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

      {/* リスト */}
      <ul className="divide-y divide-white/5 pb-2">
        {optimisticItems.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-[#5e5e72]">
            取引がありません。「追加」ボタンから登録してください。
          </li>
        )}
        {optimisticItems.map((tx) => (
          <li key={tx.id} className="flex items-center gap-3 px-4 py-3">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
              style={{
                background: `${CATEGORY_COLORS[tx.category]}18`,
                color: CATEGORY_COLORS[tx.category],
              }}
            >
              {CATEGORY_LABELS[tx.category].charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-[#f0f0f5]">{tx.description}</p>
              <p className="text-xs text-[#5e5e72]">
                {tx.date} · {CATEGORY_LABELS[tx.category]}
              </p>
            </div>
            <span
              className={`font-mono text-sm font-semibold tabular-nums ${
                tx.type === 'expense' ? 'text-[#fb7185]' : 'text-[#4ade80]'
              }`}
            >
              {tx.type === 'expense' ? '-' : '+'}¥{tx.amount.toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
