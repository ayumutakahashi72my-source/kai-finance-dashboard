'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2, ArrowLeft, TrendingUp } from 'lucide-react'
import { KAI } from '@/lib/kai-tokens'
import { getCategoryIcon } from '@/lib/category-icons'
import { sortedCategoryOptions } from '@/lib/utils'
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

/* ─── helpers ────────────────────────────────────────────────────── */

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

const MONO = 'var(--font-jetbrains), "JetBrains Mono", monospace'

function CategoryIconDisplay({ name, size = 15 }: { name: string; size?: number }) {
  const Icon = getCategoryIcon(name)
  // eslint-disable-next-line react-hooks/static-components
  return <Icon size={size} />
}

/* ─── EditDialog ─────────────────────────────────────────────────── */

function EditDialog({ tx, categories, onClose, onSaved }: {
  tx: Transaction; categories: Category[]; onClose: () => void; onSaved: () => void
}) {
  const [isIncome, setIsIncome] = useState(tx.amount > 0)
  const [amount, setAmount]     = useState(String(Math.abs(tx.amount)))
  const [payee, setPayee]       = useState(tx.payee)
  const [occurredOn, setOccurredOn] = useState(tx.occurred_on)
  const [categoryId, setCategoryId] = useState(tx.category_id ?? '')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

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
                {sortedCategoryOptions(categories).map(({ cat, indent, parentName }) => (
                  <SelectItem key={cat.id} value={cat.id} className="focus:bg-white/5">
                    <span className="flex items-center gap-1.5">
                      {indent && <span style={{ color: '#5e5e72', fontSize: 11 }}>└</span>}
                      {cat.icon && <span>{cat.icon}</span>}
                      <span>{cat.name}</span>
                      {indent && parentName && (
                        <span style={{ color: '#5e5e72', fontSize: 10 }}>{parentName}</span>
                      )}
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

/* ─── DeleteConfirmDialog ────────────────────────────────────────── */

function DeleteConfirmDialog({ tx, onClose, onDeleted }: {
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

/* ─── CategoryTransactionsPage ───────────────────────────────────── */

interface Props {
  catName:      string
  color:        string
  month:        string
  initialTxs:  Transaction[]
  categories:  Category[]
}

export function CategoryTransactionsPage({ catName, color, month, initialTxs, categories }: Props) {
  const router   = useRouter()
  const qc       = useQueryClient()
  const [editingTx, setEditingTx]   = useState<Transaction | null>(null)
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null)
  const [menuId, setMenuId]         = useState<string | null>(null)
  const [menuPos, setMenuPos]       = useState<{ top: number; right: number } | null>(null)
  const [menuTx, setMenuTx]         = useState<Transaction | null>(null)
  const [classifying, setClassifying]   = useState(false)
  const [classifyResult, setClassifyResult] = useState<{ classified: number; total: number } | null>(null)

  async function handleClassify() {
    setClassifying(true)
    setClassifyResult(null)
    try {
      const res  = await fetch('/api/transactions/classify', { method: 'POST' })
      const data = await res.json() as { classified: number; total: number }
      setClassifyResult(data)
      qc.invalidateQueries({ queryKey: ['transactions', month] })
    } finally {
      setClassifying(false)
    }
  }

  /* クライアント側で再取得（編集・削除後のリフレッシュ用） */
  const { data: txRes } = useQuery<{ data: Transaction[] }>({
    queryKey: ['transactions', month],
    queryFn:  () => fetch(`/api/transactions?month=${month}`).then((r) => r.json()),
    initialData: { data: initialTxs },
  })

  const allTxs = txRes?.data ?? initialTxs
  const transactions = allTxs.filter((tx) => {
    const name       = tx.categories?.name ?? 'その他'
    const parentName = tx.categories?.parent?.name
    return name === catName || parentName === catName
  })

  const expenses = transactions.filter((tx) => tx.amount < 0)
  const incomes  = transactions.filter((tx) => tx.amount >= 0)
  const totalExpense = expenses.reduce((s, tx) => s + Math.abs(tx.amount), 0)
  const totalIncome  = incomes.reduce((s, tx) => s + tx.amount, 0)
  const expenseGroups = groupByDate(expenses)
  const incomeGroups  = groupByDate(incomes)

  const onMutated = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['transactions', month] })
  }, [qc, month])


  function renderTxGroups(groups: [string, Transaction[]][], accent: string) {
    return groups.map(([date, txs]) => (
      <div key={date} style={{ marginBottom: 12 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '5px 4px', marginBottom: 5,
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: KAI.text4, letterSpacing: '.04em' }}>
            {formatDate(date)}
          </span>
          <span style={{ fontSize: 11, color: KAI.text4, fontFamily: MONO }}>
            ¥{Math.abs(txs.reduce((s, t) => s + t.amount, 0)).toLocaleString('ja-JP')}
          </span>
        </div>
        <div style={{
          background: 'rgba(20,22,32,0.66)',
          border: '1px solid rgba(255,255,255,.08)',
          borderRadius: 14, overflow: 'hidden',
        }}>
          {txs.map((tx, i) => {
            return (
              <div key={tx.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', position: 'relative',
                borderBottom: i < txs.length - 1 ? '1px solid rgba(255,255,255,.05)' : 'none',
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                  background: `${accent}12`, border: `1px solid ${accent}28`, color: accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {tx.amount >= 0 ? <TrendingUp size={14}/> : <CategoryIconDisplay name={tx.categories?.name ?? ''} size={14}/>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: KAI.text1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tx.payee}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                    <span style={{ fontSize: 11, color: KAI.text4 }}>
                      {tx.categories
                        ? tx.categories.parent
                          ? `${tx.categories.parent.name} › ${tx.categories.name}`
                          : tx.categories.name
                        : tx.amount >= 0 ? '収入' : '支出'}
                    </span>
                    {tx.source === 'csv' && (
                      <span style={{ fontSize: 10, background: 'rgba(167,139,250,.10)', color: '#a78bfa', borderRadius: 4, padding: '1px 5px' }}>CSV</span>
                    )}
                    {tx.source === 'auto' && (
                      <span style={{ fontSize: 10, background: 'rgba(34,211,238,.10)', color: '#22d3ee', borderRadius: 4, padding: '1px 5px' }}>自動</span>
                    )}
                  </div>
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: accent, fontFamily: MONO, letterSpacing: '-.01em' }}>
                  {tx.amount >= 0 ? '+' : ''}¥{Math.abs(tx.amount).toLocaleString('ja-JP')}
                </span>
                <button
                  onClick={(e) => {
                    if (menuId === tx.id) { setMenuId(null); return }
                    const rect = e.currentTarget.getBoundingClientRect()
                    setMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right })
                    setMenuTx(tx)
                    setMenuId(tx.id)
                  }}
                  style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: KAI.text4, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18,
                  }}
                >⋯</button>
              </div>
            )
          })}
        </div>
      </div>
    ))
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0c0a14', color: KAI.text1 }}>
      {/* ヘッダー */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 30,
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 18px',
        background: 'rgba(8,8,14,.75)', backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,.08)',
      }}>
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.10)',
            color: KAI.text3, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={16}/>
        </button>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: `${color}1c`, border: `1px solid ${color}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color,
        }}>
          <CategoryIconDisplay name={catName} size={15}/>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: KAI.text1 }}>{catName}</div>
          <div style={{ fontSize: 11, color: KAI.text4, marginTop: 1 }}>
            {month.replace('-', '年')}月 · {transactions.length}件
          </div>
        </div>
        <button
          type="button"
          onClick={handleClassify}
          disabled={classifying}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '7px 12px', borderRadius: 10, border: 'none', cursor: classifying ? 'not-allowed' : 'pointer',
            background: classifyResult ? 'rgba(74,222,128,.12)' : 'rgba(251,191,36,.12)',
            color: classifyResult ? '#4ade80' : '#fbbf24',
            fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
            opacity: classifying ? 0.6 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          {classifying ? (
            <>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fbbf24', animation: 'kai-blink 1s steps(2) infinite', display: 'inline-block' }}/>
              分類中…
            </>
          ) : classifyResult ? (
            `✓ ${classifyResult.classified}件分類済`
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 6v6l4 2"/><path d="M22 2 12 12"/>
              </svg>
              AI自動分類
            </>
          )}
        </button>
      </header>

      {/* サマリーカード */}
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '14px 16px 0' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16,
        }}>
          <div style={{
            background: 'rgba(251,113,133,.06)', border: '1px solid rgba(251,113,133,.18)',
            borderRadius: 12, padding: '10px 14px',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#fb7185', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 4 }}>出費</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fb7185', fontFamily: MONO, letterSpacing: '-.02em' }}>
              ¥{totalExpense.toLocaleString('ja-JP')}
            </div>
            <div style={{ fontSize: 10, color: KAI.text4, marginTop: 2 }}>{expenses.length}件</div>
          </div>
          <div style={{
            background: 'rgba(74,222,128,.06)', border: '1px solid rgba(74,222,128,.18)',
            borderRadius: 12, padding: '10px 14px',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#4ade80', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 4 }}>収入</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#4ade80', fontFamily: MONO, letterSpacing: '-.02em' }}>
              ¥{totalIncome.toLocaleString('ja-JP')}
            </div>
            <div style={{ fontSize: 10, color: KAI.text4, marginTop: 2 }}>{incomes.length}件</div>
          </div>
        </div>
      </div>

      {/* 取引リスト */}
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 16px 80px' }}>
        {transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: KAI.text4, fontSize: 14 }}>
            このカテゴリの取引はありません
          </div>
        ) : (
          <>
            {/* 出費セクション */}
            {expenses.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase',
                  color: '#fb7185', marginBottom: 8, paddingLeft: 2,
                }}>出費</div>
                {renderTxGroups(expenseGroups, '#fb7185')}
              </div>
            )}

            {/* 収入セクション */}
            {incomes.length > 0 && (
              <div>
                <div style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase',
                  color: '#4ade80', marginBottom: 8, paddingLeft: 2,
                }}>収入</div>
                {renderTxGroups(incomeGroups, '#4ade80')}
              </div>
            )}
          </>
        )}
      </div>

      {/* ⋯ メニュー（overflow:hidden の外に固定配置） */}
      {menuId && menuPos && menuTx && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuId(null)}/>
          <div style={{
            position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 50,
            minWidth: 120, borderRadius: 12, overflow: 'hidden',
            background: 'rgba(20,22,32,.98)',
            border: '1px solid rgba(255,255,255,.12)',
            boxShadow: '0 8px 32px rgba(0,0,0,.6)',
          }}>
            <button
              onClick={() => { setMenuId(null); setEditingTx(menuTx) }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '12px 16px', fontSize: 14, color: '#c4c4d0', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            ><Pencil size={14}/> 編集</button>
            <div style={{ height: 1, background: 'rgba(255,255,255,.06)' }}/>
            <button
              onClick={() => { setMenuId(null); setDeletingTx(menuTx) }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '12px 16px', fontSize: 14, color: '#fb7185', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            ><Trash2 size={14}/> 削除</button>
          </div>
        </>
      )}

      {/* ダイアログ */}
      {editingTx && (
        <EditDialog tx={editingTx} categories={categories}
          onClose={() => setEditingTx(null)}
          onSaved={() => { onMutated(); setEditingTx(null) }}/>
      )}
      {deletingTx && (
        <DeleteConfirmDialog tx={deletingTx}
          onClose={() => setDeletingTx(null)}
          onDeleted={() => { onMutated(); setDeletingTx(null) }}/>
      )}
    </div>
  )
}
