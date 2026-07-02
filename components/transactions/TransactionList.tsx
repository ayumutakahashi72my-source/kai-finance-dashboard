'use client'

// 旧 TransactionList（日付グループ一覧）は TransactionsView に置き換えられ未使用だったため削除。
// このファイルは取引の編集ダイアログのみを提供する。
// 「固定費にする/解除」は旧TransactionListの⋯メニューにしか無かったため、ここに移植した。

import { useState } from 'react'
import { KAI } from '@/lib/kai-tokens'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Transaction, Category } from '@/lib/types'
import { sortedCategoryOptions } from '@/lib/utils'

// ── 編集ダイアログ ──────────────────────────────────────────────────────────
export function EditDialog({
  tx,
  categories,
  onClose,
  onSaved,
}: {
  tx: Transaction
  categories: Category[]
  onClose: () => void
  onSaved: () => void
}) {
  const isIncomeTx = tx.amount > 0
  const [isIncome, setIsIncome] = useState(isIncomeTx)
  const [amount, setAmount] = useState(String(Math.abs(tx.amount)))
  const [payee, setPayee] = useState(tx.payee)
  const [occurredOn, setOccurredOn] = useState(tx.occurred_on)
  const [categoryId, setCategoryId] = useState(tx.category_id ?? '')
  const [isFixed, setIsFixed] = useState(!!tx.is_fixed)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    const parsedAmount = parseInt(amount, 10)
    if (!payee.trim()) { setError('支払先を入力してください'); return }
    if (!parsedAmount) { setError('金額を入力してください'); return }
    if (!occurredOn)   { setError('日付を入力してください'); return }
    setSaving(true)
    setError('')
    try {
      const finalAmount = isIncome ? Math.abs(parsedAmount) : -Math.abs(parsedAmount)
      const res = await fetch(`/api/transactions/${tx.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: finalAmount,
          payee: payee.trim(),
          occurred_on: occurredOn,
          category_id: categoryId || null,
          is_fixed: isFixed,
        }),
      })
      if (!res.ok) {
        let msg = '保存に失敗しました'
        try {
          const j = await res.json()
          if (typeof j.error === 'string') msg = j.error
        } catch { /* レスポンスがJSONでない場合は無視 */ }
        setError(msg)
        return
      }
      onSaved()
      onClose()
    } catch {
      setError('通信エラーが発生しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="bg-[var(--kai-dropdown-bg)] border-[var(--kai-border2)] text-[var(--kai-text1)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[var(--kai-text1)]">取引を編集</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 pt-2">
          <div className="grid gap-1.5">
            <Label className="text-[var(--kai-text3)] text-xs">種別</Label>
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
                      : 'border-[var(--kai-border2)] text-[var(--kai-text3)] hover:border-[var(--kai-border-strong)]'
                  }`}
                >
                  {inc ? '収入' : '支出'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label className="text-[var(--kai-text3)] text-xs">日付</Label>
            <Input
              type="date"
              value={occurredOn}
              onChange={(e) => setOccurredOn(e.target.value)}
              required
              className="bg-[var(--kai-bg)] border-[var(--kai-border2)] text-[var(--kai-text1)] focus-visible:border-[#fb9477]/50 focus-visible:ring-[#fb9477]/20"
            />
          </div>

          <div className="grid gap-1.5">
            <Label className="text-[var(--kai-text3)] text-xs">金額（円）</Label>
            <Input
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="bg-[var(--kai-bg)] border-[var(--kai-border2)] text-[var(--kai-text1)] placeholder:text-[var(--kai-text4)] focus-visible:border-[#fb9477]/50 focus-visible:ring-[#fb9477]/20"
            />
          </div>

          <div className="grid gap-1.5">
            <Label className="text-[var(--kai-text3)] text-xs">カテゴリ</Label>
            <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? '')}>
              <SelectTrigger className="w-full bg-[var(--kai-bg)] border-[var(--kai-border2)] text-[var(--kai-text1)] focus-visible:border-[#fb9477]/50">
                {(() => {
                  if (!categoryId) return <span className="text-[var(--kai-text4)]">選択なし</span>
                  const found = categories.find((c) => c.id === categoryId)
                  if (!found) return <span className="text-[var(--kai-text4)]">選択なし</span>
                  const parent = found.parent_id ? categories.find((c) => c.id === found.parent_id) : null
                  return <span>{parent ? `${parent.name} › ${found.name}` : found.name}</span>
                })()}
              </SelectTrigger>
              <SelectContent className="bg-[var(--kai-dropdown-bg)] border-[var(--kai-border2)] text-[var(--kai-text1)]">
                {sortedCategoryOptions(categories).map(({ cat, indent, parentName }) => (
                  <SelectItem
                    key={cat.id}
                    value={cat.id}
                    className="focus:bg-[var(--kai-overlay-weak)] focus:text-[var(--kai-text1)]"
                  >
                    <span className="flex items-center gap-1.5">
                      {indent && <span style={{ color: KAI.text4, fontSize: 11 }}>└</span>}
                      <CategoryIcon name={cat.icon} size={13} />
                      <span>{cat.name}</span>
                      {indent && parentName && (
                        <span style={{ color: KAI.text4, fontSize: 10 }}>{parentName}</span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label className="text-[var(--kai-text3)] text-xs">支払先</Label>
            <Input
              type="text"
              maxLength={100}
              value={payee}
              onChange={(e) => setPayee(e.target.value)}
              required
              className="bg-[var(--kai-bg)] border-[var(--kai-border2)] text-[var(--kai-text1)] placeholder:text-[var(--kai-text4)] focus-visible:border-[#fb9477]/50 focus-visible:ring-[#fb9477]/20"
            />
          </div>

          {/* 固定費トグル（旧⋯メニューから移植） */}
          <button
            type="button"
            onClick={() => setIsFixed((p) => !p)}
            aria-pressed={isFixed}
            className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-colors ${
              isFixed
                ? 'border-[#a78bfa]/40 bg-[#a78bfa]/10 text-[#c4b5fd]'
                : 'border-[var(--kai-border2)] text-[var(--kai-text3)] hover:border-[var(--kai-border-strong)]'
            }`}
          >
            <span className="font-medium">固定費として扱う</span>
            <span
              className="relative inline-block h-5 w-9 rounded-full transition-colors"
              style={{ background: isFixed ? '#a78bfa' : 'var(--kai-border2)' }}
            >
              <span
                className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all"
                style={{ left: isFixed ? 18 : 2 }}
              />
            </span>
          </button>

          {error && (
            <p className="rounded-lg border border-[#fb7185]/20 bg-[#fb7185]/5 px-3 py-2 text-xs text-[#fb7185]">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="border-[var(--kai-border2)] bg-transparent -mx-4 -mb-4 px-4 pb-4 pt-2 gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-[var(--kai-text3)] hover:text-[var(--kai-text1)] hover:bg-[var(--kai-overlay-weak)]"
          >
            キャンセル
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#fb9477] text-[#0a0a10] font-semibold hover:bg-[#fb9477]/90 disabled:opacity-50"
          >
            {saving ? '保存中…' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
