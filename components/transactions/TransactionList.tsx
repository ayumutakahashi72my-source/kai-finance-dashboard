'use client'

import { useOptimistic, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, CheckSquare, Square, Pin, PinOff } from 'lucide-react'
import { KAI } from '@/lib/kai-tokens'
import { resolveIconName } from '@/lib/category-icons'
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
import { DEFAULT_CATEGORY_COLORS } from '@/lib/types'
import { sortedCategoryOptions } from '@/lib/utils'

function categoryColor(tx: Transaction): string {
  if (tx.categories?.color) return tx.categories.color
  if (tx.categories?.parent?.color) return tx.categories.parent.color
  if (tx.categories?.name) return DEFAULT_CATEGORY_COLORS[tx.categories.name] ?? KAI.text3
  return tx.amount >= 0 ? '#4ade80' : '#fb7185'
}

function categoryLabel(tx: Transaction): string {
  const cat = tx.categories
  if (!cat) return tx.amount >= 0 ? '収入' : '支出'
  if (cat.parent) return `${cat.parent.name} › ${cat.name}`
  return cat.name
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
    .slice(0, 10)
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  const todayD = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diff = Math.floor((todayD.getTime() - d.getTime()) / 86400000)
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

// ── 削除確認ダイアログ ───────────────────────────────────────────────────────
export function DeleteConfirmDialog({
  tx,
  onClose,
  onDeleted,
}: {
  tx: Transaction
  onClose: () => void
  onDeleted: () => void
}) {
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      await fetch(`/api/transactions/${tx.id}`, { method: 'DELETE' })
      onDeleted()
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="bg-[var(--kai-dropdown-bg)] border-[var(--kai-border2)] text-[var(--kai-text1)] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-[var(--kai-text1)]">取引を削除</DialogTitle>
        </DialogHeader>
        <p className="text-[14px] text-[var(--kai-text2)]">
          「{tx.payee}」(¥{Math.abs(tx.amount).toLocaleString()}) を削除しますか？この操作は取り消せません。
        </p>
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
            onClick={handleDelete}
            disabled={deleting}
            className="bg-[#fb7185]/20 text-[#fb7185] border border-[#fb7185]/30 font-semibold hover:bg-[#fb7185]/30 disabled:opacity-50"
          >
            {deleting ? '削除中…' : '削除する'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── メインコンポーネント ─────────────────────────────────────────────────────
export function TransactionList({ initial, categories, uncategorizedCount = 0 }: Props) {
  const router = useRouter()

  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null)
  const [actionMenuId, setActionMenuId] = useState<string | null>(null)
  const [menuPos, setMenuPos]   = useState<{ top: number; right: number } | null>(null)
  const [menuTx, setMenuTx]     = useState<Transaction | null>(null)

  // 一括削除
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkConfirm, setBulkConfirm] = useState(false)

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelectedIds(new Set())
    setBulkConfirm(false)
  }

  async function handleBulkDelete() {
    if (!selectedIds.size) return
    setBulkDeleting(true)
    try {
      await fetch('/api/transactions/bulk-delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...selectedIds] }),
      })
      exitSelectMode()
      router.refresh()
    } finally {
      setBulkDeleting(false)
    }
  }

  const [optimisticItems] = useOptimistic(
    initial,
    (state: Transaction[], newItem: Transaction) => [newItem, ...state]
  )

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
      {/* ⋯ メニュー（fixed で overflow:hidden の外に描画） */}
      {actionMenuId && menuPos && menuTx && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setActionMenuId(null)} />
          <div
            className="fixed z-50 min-w-[120px] overflow-hidden rounded-[12px]"
            style={{
              top: menuPos.top, right: menuPos.right,
              background: KAI.dropdownBg,
              border: `1px solid ${KAI.border2}`,
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            }}
          >
            <button
              onClick={() => { setActionMenuId(null); setEditingTx(menuTx) }}
              className="flex w-full items-center gap-2 px-4 py-3 text-[14px] text-[var(--kai-text2)] transition-colors hover:bg-[var(--kai-overlay-weak)]"
            >
              <Pencil className="size-3.5" /> 編集
            </button>
            <div className="h-px bg-[var(--kai-overlay-weak)]" />
            <button
              onClick={async () => {
                setActionMenuId(null)
                await fetch(`/api/transactions/${menuTx.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ is_fixed: !menuTx.is_fixed }),
                })
                router.refresh()
              }}
              className="flex w-full items-center gap-2 px-4 py-3 text-[14px] text-[#a78bfa] transition-colors hover:bg-[#a78bfa]/10"
            >
              {menuTx.is_fixed
                ? <><PinOff className="size-3.5" /> 固定費を解除</>
                : <><Pin className="size-3.5" /> 固定費にする</>
              }
            </button>
            <div className="h-px bg-[var(--kai-overlay-weak)]" />
            <button
              onClick={() => { setActionMenuId(null); setDeletingTx(menuTx) }}
              className="flex w-full items-center gap-2 px-4 py-3 text-[14px] text-[#fb7185] transition-colors hover:bg-[#fb7185]/10"
            >
              <Trash2 className="size-3.5" /> 削除
            </button>
          </div>
        </>
      )}

      {/* 編集ダイアログ */}
      {editingTx && (
        <EditDialog
          tx={editingTx}
          categories={categories}
          onClose={() => setEditingTx(null)}
          onSaved={() => router.refresh()}
        />
      )}

      {/* 削除確認ダイアログ */}
      {deletingTx && (
        <DeleteConfirmDialog
          tx={deletingTx}
          onClose={() => setDeletingTx(null)}
          onDeleted={() => router.refresh()}
        />
      )}

      {/* 一括削除確認バー */}
      {selectMode && (
        <div
          className="mb-3 flex items-center justify-between rounded-[12px] px-3 py-2.5"
          style={{ background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.2)' }}
        >
          <span className="text-[13px] text-[#fb7185]">{selectedIds.size}件選択中</span>
          <div className="flex gap-2">
            <button
              onClick={exitSelectMode}
              className="rounded-[8px] px-3 py-1.5 text-[12px] text-[var(--kai-text3)] hover:bg-[var(--kai-overlay-weak)]"
            >
              キャンセル
            </button>
            {!bulkConfirm ? (
              <button
                onClick={() => setBulkConfirm(true)}
                disabled={!selectedIds.size}
                className="rounded-[8px] bg-[#fb7185]/20 px-3 py-1.5 text-[12px] font-medium text-[#fb7185] hover:bg-[#fb7185]/30 disabled:opacity-40"
              >
                削除
              </button>
            ) : (
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="rounded-[8px] bg-[#fb7185] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#fb7185]/90 disabled:opacity-50"
              >
                {bulkDeleting ? '削除中…' : '本当に削除する'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <p className="lbl">取引履歴</p>
        <div className="flex items-center gap-2">
          {!selectMode && hasUncategorized && (
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
          <button
            onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
            className="flex items-center gap-1.5 rounded-[10px] border border-[var(--kai-border2)] px-3 py-2 text-[12px] text-[var(--kai-text3)] transition-colors hover:bg-[var(--kai-overlay-weak)] hover:text-[var(--kai-text1)]"
          >
            <CheckSquare className="size-3.5" />
            {selectMode ? 'キャンセル' : '選択'}
          </button>
        </div>
      </div>

      {/* Date-grouped list */}
      {optimisticItems.length === 0 ? (
        <div
          className="rounded-[18px] px-4 py-8 text-center text-sm"
          style={{ color: KAI.text4, background: KAI.bgPanel, border: `1px solid ${KAI.border2}` }}
        >
          取引がありません。＋ボタンから記録してください。
        </div>
      ) : (
        groups.map(([date, txs], gi) => {
          const dayTotal = txs.reduce((s, t) => s + t.amount, 0)
          return (
            <div key={date} className="mb-3.5 reveal-up" style={{ animationDelay: `${gi * 50}ms` }}>
              <div className="flex items-center justify-between px-1 py-2">
                <p className="text-[12px] font-bold tracking-[0.04em] text-[var(--kai-text3)]">
                  {formatDateLabel(date)}
                </p>
                <p
                  className="mono text-[12px] font-semibold"
                  style={{ color: dayTotal >= 0 ? '#4ade80' : KAI.text3 }}
                >
                  {dayTotal >= 0 ? '+' : ''}¥{Math.abs(dayTotal).toLocaleString()}
                </p>
              </div>

              <div
                className="rounded-[18px] px-3 py-1"
                style={{ background: KAI.bgPanel, backdropFilter: 'blur(24px) saturate(160%)', border: `1px solid ${KAI.border2}` }}
              >
                {txs.map((tx, i) => {
                  const color = categoryColor(tx)
                  const isMenuOpen = actionMenuId === tx.id
                  const isSelected = selectedIds.has(tx.id)
                  return (
                    <div
                      key={tx.id}
                      className="relative flex min-h-[48px] items-center gap-3 py-3.5"
                      style={{ borderBottom: i < txs.length - 1 ? `1px solid ${KAI.overlayBorder}` : 'none' }}
                      onClick={selectMode ? () => toggleSelect(tx.id) : undefined}
                    >
                      {/* チェックボックス（選択モード時） */}
                      {selectMode && (
                        <div className="shrink-0 text-[#fb7185]">
                          {isSelected
                            ? <CheckSquare className="size-5" />
                            : <Square className="size-5 text-[var(--kai-text4)]" />
                          }
                        </div>
                      )}
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] text-[15px]"
                        style={{
                          background: tx.amount >= 0 ? 'rgba(74,222,128,0.10)' : KAI.overlayWeak,
                          border: `1px solid ${tx.amount >= 0 ? 'rgba(74,222,128,0.25)' : KAI.border2}`,
                          color: tx.amount >= 0 ? '#4ade80' : color,
                        }}
                      >
                        <CategoryIcon
                          name={tx.amount >= 0 ? 'TrendingUp' : (resolveIconName(tx.categories?.name ?? '') ?? 'Tag')}
                          size={18}
                          color={tx.amount >= 0 ? '#4ade80' : color}
                        />
                      </div>
                      <div className="min-w-0 flex-1" style={tx.excluded ? { opacity: 0.45 } : undefined}>
                        <p className="truncate text-[14px] font-medium text-[var(--kai-text1)]">{tx.payee}</p>
                        <p className="mono mt-0.5 text-[12px] text-[var(--kai-text3)]">
                          {categoryLabel(tx)}
                          {tx.excluded && (
                            <span className="ml-1.5 rounded bg-[#fbbf24]/15 px-1 py-px text-[10px] text-[#fbbf24]">除外</span>
                          )}
                          {tx.source === 'csv' && (
                            <span className="ml-1.5 rounded bg-[#a78bfa]/10 px-1 py-px text-[10px] text-[#a78bfa]">CSV</span>
                          )}
                          {tx.source === 'auto' && (
                            <span className="ml-1.5 rounded bg-[#22d3ee]/10 px-1 py-px text-[10px] text-[#22d3ee]">自動</span>
                          )}
                          {tx.is_fixed && (
                            <span className="ml-1.5 rounded bg-[#a78bfa]/10 px-1 py-px text-[10px] text-[#a78bfa]">固定費</span>
                          )}
                          {tx.source_account && (
                            <span className="ml-1.5 rounded bg-[#38bdf8]/10 px-1 py-px text-[10px] text-[#38bdf8]">{tx.source_account}</span>
                          )}
                        </p>
                      </div>
                      <span
                        className="mono text-[15px] font-semibold"
                        style={{ color: tx.amount >= 0 ? '#4ade80' : KAI.text1 }}
                      >
                        {tx.amount >= 0 ? '+' : ''}¥{Math.abs(tx.amount).toLocaleString()}
                      </span>

                      {/* アクションメニュー（選択モード時は非表示） */}
                      {!selectMode && (
                        <div className="ml-1">
                          <button
                            onClick={(e) => {
                              if (isMenuOpen) { setActionMenuId(null); return }
                              const rect = e.currentTarget.getBoundingClientRect()
                              setMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right })
                              setMenuTx(tx)
                              setActionMenuId(tx.id)
                            }}
                            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--kai-text4)] transition-colors hover:bg-[var(--kai-overlay-weak)] hover:text-[var(--kai-text3)]"
                            aria-label="アクション"
                          >
                            ⋯
                          </button>
                        </div>
                      )}
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
