'use client'

import { useState, useEffect } from 'react'
import { Pencil, Trash2, X, TrendingUp } from 'lucide-react'
import { KAI } from '@/lib/kai-tokens'
import { getCategoryIcon } from '@/lib/category-icons'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import type { Transaction, Category } from '@/lib/types'

// ── ヘルパー ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  const dows = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getMonth() + 1}/${d.getDate()}（${dows[d.getDay()]}）`
}

function groupByDate(txs: Transaction[]) {
  const map: Record<string, Transaction[]> = {}
  for (const tx of txs) {
    if (!map[tx.occurred_on]) map[tx.occurred_on] = []
    map[tx.occurred_on].push(tx)
  }
  return Object.entries(map).sort(([a], [b]) => b.localeCompare(a))
}

// ── 編集ダイアログ ───────────────────────────────────────────────────────────

function EditDialog({
  tx, categories, onClose, onSaved,
}: {
  tx: Transaction; categories: Category[]; onClose: () => void; onSaved: () => void
}) {
  const [isIncome, setIsIncome] = useState(tx.amount > 0)
  const [amount, setAmount] = useState(String(Math.abs(tx.amount)))
  const [payee, setPayee] = useState(tx.payee)
  const [occurredOn, setOccurredOn] = useState(tx.occurred_on)
  const [categoryId, setCategoryId] = useState(tx.category_id ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    const parsed = parseInt(amount, 10)
    if (!payee.trim() || !parsed || !occurredOn) return
    setSaving(true); setError('')
    try {
      const res = await fetch(`/api/transactions/${tx.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: isIncome ? Math.abs(parsed) : -Math.abs(parsed),
          payee: payee.trim(), occurred_on: occurredOn,
          category_id: categoryId || null,
        }),
      })
      if (!res.ok) { const j = await res.json(); setError(j.error ?? '保存に失敗しました'); return }
      onSaved(); onClose()
    } finally { setSaving(false) }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="bg-[#14161f] border-white/10 text-[#f0f0f5] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#f0f0f5]">取引を編集</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 pt-2">
          <div className="grid gap-1.5">
            <Label className="text-[#8b8ba0] text-xs">種別</Label>
            <div className="grid grid-cols-2 gap-2">
              {[false, true].map((inc) => (
                <button key={String(inc)} type="button" onClick={() => setIsIncome(inc)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    isIncome === inc
                      ? inc ? 'border-[#4ade80]/40 bg-[#4ade80]/10 text-[#4ade80]'
                             : 'border-[#fb7185]/40 bg-[#fb7185]/10 text-[#fb7185]'
                      : 'border-white/10 text-[#8b8ba0] hover:border-white/20'
                  }`}>{inc ? '収入' : '支出'}</button>
              ))}
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-[#8b8ba0] text-xs">日付</Label>
            <Input type="date" value={occurredOn} onChange={(e) => setOccurredOn(e.target.value)}
              className="bg-[#0a0a10] border-white/10 text-[#f0f0f5] focus-visible:border-[#fb9477]/50 focus-visible:ring-[#fb9477]/20"/>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-[#8b8ba0] text-xs">金額（円）</Label>
            <Input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)}
              className="bg-[#0a0a10] border-white/10 text-[#f0f0f5] focus-visible:border-[#fb9477]/50 focus-visible:ring-[#fb9477]/20"/>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-[#8b8ba0] text-xs">カテゴリ</Label>
            <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? '')}>
              <SelectTrigger className="w-full bg-[#0a0a10] border-white/10 text-[#f0f0f5]">
                <SelectValue placeholder="選択なし"/>
              </SelectTrigger>
              <SelectContent className="bg-[#14161f] border-white/10 text-[#f0f0f5]">
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id} className="focus:bg-white/5">
                    <span className="flex items-center gap-2">
                      <CategoryIcon name={cat.icon} size={13} />{cat.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-[#8b8ba0] text-xs">支払先</Label>
            <Input type="text" maxLength={100} value={payee} onChange={(e) => setPayee(e.target.value)}
              className="bg-[#0a0a10] border-white/10 text-[#f0f0f5] focus-visible:border-[#fb9477]/50 focus-visible:ring-[#fb9477]/20"/>
          </div>
          {error && <p className="rounded-lg border border-[#fb7185]/20 bg-[#fb7185]/5 px-3 py-2 text-xs text-[#fb7185]">{error}</p>}
        </div>
        <DialogFooter className="border-white/10 bg-transparent -mx-4 -mb-4 px-4 pb-4 pt-2 gap-2">
          <Button variant="ghost" onClick={onClose} className="text-[#8b8ba0] hover:text-[#f0f0f5] hover:bg-white/5">キャンセル</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-[#fb9477] text-[#0a0a10] font-semibold hover:bg-[#fb9477]/90 disabled:opacity-50">
            {saving ? '保存中…' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── 削除確認ダイアログ ───────────────────────────────────────────────────────

function DeleteConfirmDialog({
  tx, onClose, onDeleted,
}: {
  tx: Transaction; onClose: () => void; onDeleted: () => void
}) {
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      await fetch(`/api/transactions/${tx.id}`, { method: 'DELETE' })
      onDeleted(); onClose()
    } finally { setDeleting(false) }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="bg-[#14161f] border-white/10 text-[#f0f0f5] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-[#f0f0f5]">取引を削除</DialogTitle>
        </DialogHeader>
        <p className="text-[14px] text-[#c4c4d0]">
          「{tx.payee}」(¥{Math.abs(tx.amount).toLocaleString()}) を削除しますか？この操作は取り消せません。
        </p>
        <DialogFooter className="border-white/10 bg-transparent -mx-4 -mb-4 px-4 pb-4 pt-2 gap-2">
          <Button variant="ghost" onClick={onClose} className="text-[#8b8ba0] hover:text-[#f0f0f5] hover:bg-white/5">キャンセル</Button>
          <Button onClick={handleDelete} disabled={deleting}
            className="bg-[#fb7185]/20 text-[#fb7185] border border-[#fb7185]/30 font-semibold hover:bg-[#fb7185]/30 disabled:opacity-50">
            {deleting ? '削除中…' : '削除する'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── メインドロワー ───────────────────────────────────────────────────────────

interface Props {
  catName: string
  color: string
  transactions: Transaction[]
  categories: Category[]
  onClose: () => void
  onMutated: () => void
}

export function CategoryTransactionDrawer({
  catName, color, transactions, categories, onClose, onMutated,
}: Props) {
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)

  // Esc キーで閉じる
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const total = transactions.reduce((s, tx) => s + tx.amount, 0)
  const groups = groupByDate(transactions)

  return (
    <>
      {/* 編集ダイアログ */}
      {editingTx && (
        <EditDialog tx={editingTx} categories={categories}
          onClose={() => setEditingTx(null)}
          onSaved={() => { onMutated(); setEditingTx(null) }}/>
      )}
      {/* 削除確認ダイアログ */}
      {deletingTx && (
        <DeleteConfirmDialog tx={deletingTx}
          onClose={() => setDeletingTx(null)}
          onDeleted={() => { onMutated(); setDeletingTx(null) }}/>
      )}

      {/* オーバーレイ */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* ボトムシート */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col"
        style={{
          maxHeight: '82dvh',
          background: 'rgba(14,12,22,0.98)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderBottom: 'none',
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
          animation: 'kai-rise .28s cubic-bezier(.2,.8,.3,1) both',
        }}
      >
        {/* ハンドル */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.15)' }}/>
        </div>

        {/* ヘッダー */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 18px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            background: `${color}1c`, border: `1px solid ${color}33`,
          }}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: KAI.text1 }}>{catName}</div>
            <div style={{ fontSize: 11, color: KAI.text4, marginTop: 1 }}>
              {transactions.length}件 · 合計
              <span style={{ marginLeft: 4, fontFamily: 'var(--font-jetbrains),monospace', color: total >= 0 ? KAI.success : KAI.coral }}>
                {total >= 0 ? '+' : ''}¥{Math.abs(total).toLocaleString('ja-JP')}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)',
              color: KAI.text3, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={15}/>
          </button>
        </div>

        {/* トランザクションリスト */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '8px 14px 24px' }}>
          {transactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: KAI.text4, fontSize: 13 }}>
              このカテゴリの取引はありません
            </div>
          ) : (
            groups.map(([date, txs]) => (
              <div key={date} style={{ marginBottom: 12 }}>
                {/* 日付ヘッダー */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '6px 4px', marginBottom: 4,
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: KAI.text4, letterSpacing: '.04em' }}>
                    {formatDate(date)}
                  </span>
                  <span style={{ fontSize: 11, color: KAI.text4, fontFamily: 'var(--font-jetbrains),monospace' }}>
                    {txs.reduce((s, t) => s + t.amount, 0) >= 0 ? '+' : ''}
                    ¥{Math.abs(txs.reduce((s, t) => s + t.amount, 0)).toLocaleString('ja-JP')}
                  </span>
                </div>

                {/* 取引カード */}
                <div style={{
                  background: 'rgba(20,22,32,0.66)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 14, overflow: 'hidden',
                }}>
                  {txs.map((tx, i) => {
                    const isOpen = menuId === tx.id
                    const CatIcon = getCategoryIcon(tx.categories?.name ?? '')
                    return (
                      <div
                        key={tx.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '11px 12px', position: 'relative',
                          borderBottom: i < txs.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                        }}
                      >
                        {/* アイコン */}
                        <div style={{
                          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                          background: tx.amount >= 0 ? 'rgba(74,222,128,0.10)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${tx.amount >= 0 ? 'rgba(74,222,128,0.25)' : 'rgba(255,255,255,0.10)'}`,
                          color: tx.amount >= 0 ? '#4ade80' : color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {tx.amount >= 0
                            ? <TrendingUp size={14}/>
                            : <CatIcon size={14}/>
                          }
                        </div>

                        {/* 内容 */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: KAI.text1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {tx.payee}
                          </div>
                          <div style={{ fontSize: 11, color: KAI.text4, marginTop: 2 }}>
                            {tx.categories?.name ?? (tx.amount >= 0 ? '収入' : '支出')}
                            {tx.source === 'csv' && <span style={{ marginLeft: 6, fontSize: 10, background: 'rgba(167,139,250,0.1)', color: '#a78bfa', borderRadius: 4, padding: '1px 5px' }}>CSV</span>}
                            {tx.source === 'auto' && <span style={{ marginLeft: 6, fontSize: 10, background: 'rgba(34,211,238,0.1)', color: '#22d3ee', borderRadius: 4, padding: '1px 5px' }}>自動</span>}
                          </div>
                        </div>

                        {/* 金額 */}
                        <span style={{
                          fontSize: 14, fontWeight: 600,
                          color: tx.amount >= 0 ? '#4ade80' : KAI.text1,
                          fontFamily: 'var(--font-jetbrains),monospace',
                          letterSpacing: '-.01em',
                        }}>
                          {tx.amount >= 0 ? '+' : ''}¥{Math.abs(tx.amount).toLocaleString('ja-JP')}
                        </span>

                        {/* ⋯ メニュー */}
                        <div style={{ position: 'relative', marginLeft: 4 }}>
                          <button
                            onClick={() => setMenuId(isOpen ? null : tx.id)}
                            style={{
                              width: 30, height: 30, borderRadius: '50%',
                              background: 'transparent', border: 'none', cursor: 'pointer',
                              color: KAI.text4, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 16,
                            }}
                          >⋯</button>
                          {isOpen && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setMenuId(null)}/>
                              <div style={{
                                position: 'absolute', right: 0, top: 34, zIndex: 20,
                                minWidth: 110, borderRadius: 12, overflow: 'hidden',
                                background: 'rgba(20,22,32,0.98)',
                                border: '1px solid rgba(255,255,255,0.12)',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                              }}>
                                <button
                                  onClick={() => { setMenuId(null); setEditingTx(tx) }}
                                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', fontSize: 13, color: '#c4c4d0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                                >
                                  <Pencil size={13}/> 編集
                                </button>
                                <button
                                  onClick={() => { setMenuId(null); setDeletingTx(tx) }}
                                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', fontSize: 13, color: '#fb7185', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                                >
                                  <Trash2 size={13}/> 削除
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
