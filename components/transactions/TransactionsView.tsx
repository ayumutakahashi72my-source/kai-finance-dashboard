'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { KAI } from '@/lib/kai-tokens'
import { TransactionFilters, readFiltersFromUrl, isFilterActive } from '@/components/transactions/TransactionFilters'
import { EditDialog } from '@/components/transactions/TransactionList'
import { TransactionRow } from '@/components/transactions/TransactionRow'
import { DuplicateChecker } from '@/components/transactions/DuplicateChecker'
import { CalendarView } from '@/components/calendar/CalendarView'
import { MonthSwitcher } from '@/components/dashboard/MonthSwitcher'
import { Skeleton } from '@/components/ui/Skeleton'
import type { Transaction, Category } from '@/lib/types'

const MONO: React.CSSProperties = {
  fontFamily: 'var(--font-jetbrains), "JetBrains Mono", monospace',
}

const CAT_COLORS = [
  KAI.coral, KAI.blue, KAI.violet, KAI.success,
  KAI.warning, KAI.mint, KAI.cyan, KAI.danger,
  KAI.amber, KAI.mintExtra,
]

const UNDO_DELAY_MS = 5000
// 一括削除がこの件数以上のときは確認ステップを挟む
const BULK_CONFIRM_THRESHOLD = 5

/* ── SVG icons ─────────────────────────────────────────────── */
const ListIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
)
const CalIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
  </svg>
)

/* ── View Toggle ───────────────────────────────────────────── */
function ViewToggle({ view, onChange }: { view: 'list' | 'calendar'; onChange: (v: 'list' | 'calendar') => void }) {
  const btnBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '6px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
  }
  return (
    <div style={{ display: 'flex', background: KAI.overlayWeak, border: `1px solid ${KAI.border2}`, borderRadius: 10, padding: 2 }}>
      <button
        onClick={() => onChange('list')}
        style={{
          ...btnBase,
          borderRadius: 8,
          background: view === 'list' ? KAI.cardBg : 'none',
          border: view === 'list' ? `1px solid ${KAI.border2}` : 'none',
          fontWeight: view === 'list' ? 600 : 400,
          color: view === 'list' ? KAI.text1 : KAI.text3,
        }}
      ><ListIcon />リスト</button>
      <button
        onClick={() => onChange('calendar')}
        style={{
          ...btnBase,
          borderRadius: 8,
          background: view === 'calendar' ? KAI.cardBg : 'none',
          border: view === 'calendar' ? `1px solid ${KAI.border2}` : 'none',
          fontWeight: view === 'calendar' ? 600 : 400,
          color: view === 'calendar' ? KAI.text1 : KAI.text3,
        }}
      ><CalIcon />カレンダー</button>
    </div>
  )
}

/* ── Summary Chips（前月比較付き） ────────────────────────────── */
function trendLabel(current: number, prev: number | undefined): string | null {
  if (prev === undefined || prev === 0) return null
  const diff = ((current - prev) / prev) * 100
  if (Math.abs(diff) < 1) return '前月並み'
  const sign = diff > 0 ? '+' : ''
  return `${sign}${diff.toFixed(0)}% 前月比`
}

function SummaryChips({
  income, expense, balance, prevIncome, prevExpense,
}: {
  income: number; expense: number; balance: number
  prevIncome?: number; prevExpense?: number
}) {
  // 「残り」は唯一負になり得るチップ。マイナス時は符号と色で赤字を明示する
  const chips: { label: string; value: number; color: string; bgAlpha: string; borderAlpha: string; trend: string | null }[] = [
    { label: '収入', value: income, color: KAI.success, bgAlpha: 'rgba(74,222,128,.07)', borderAlpha: 'rgba(74,222,128,.2)', trend: trendLabel(income, prevIncome) },
    { label: '支出', value: expense, color: KAI.danger, bgAlpha: 'rgba(251,113,133,.07)', borderAlpha: 'rgba(251,113,133,.2)', trend: trendLabel(expense, prevExpense) },
    {
      label: '残り', value: balance,
      color: balance < 0 ? KAI.danger : KAI.blue,
      bgAlpha: balance < 0 ? 'rgba(251,113,133,.07)' : 'rgba(122,167,255,.07)',
      borderAlpha: balance < 0 ? 'rgba(251,113,133,.2)' : 'rgba(122,167,255,.2)',
      trend: null,
    },
  ]
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {chips.map(c => (
        <div key={c.label} style={{
          flex: 1, background: c.bgAlpha, border: `1px solid ${c.borderAlpha}`,
          borderRadius: 12, padding: '7px 10px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 8.5, color: KAI.text3, fontWeight: 700, letterSpacing: '.06em', marginBottom: 2 }}>{c.label}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: c.color, ...MONO }}>
            {c.label === '残り' ? (c.value >= 0 ? '+' : '−') : ''}¥{Math.abs(c.value).toLocaleString('ja-JP')}
          </div>
          {c.trend && (
            <div style={{ fontSize: 8, color: KAI.text4, marginTop: 1, ...MONO }}>{c.trend}</div>
          )}
        </div>
      ))}
    </div>
  )
}

/* ── TransactionsView (main) ───────────────────────────────── */

interface Props {
  month: string
  initialView?: 'list' | 'calendar'
}

function prevMonthOf(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 2, 1) // m は1-12、Dateのmonthは0-11なので -2
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function TransactionsView({ month, initialView = 'list' }: Props) {
  const router = useRouter()
  const qc     = useQueryClient()
  const searchParams = useSearchParams()
  const filters = readFiltersFromUrl(searchParams)
  const hasFilter = isFilterActive(filters)
  const [showFilters, setShowFilters] = useState(hasFilter)

  const [view, setView] = useState<'list' | 'calendar'>(initialView)
  const [classifying,    setClassifying]    = useState(false)
  const [classifyResult, setClassifyResult] = useState<{ classified: number; total: number } | null>(null)

  const [editingTx, setEditingTx] = useState<Transaction | null>(null)

  // 選択モード（複数選択→一括削除）
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkConfirming, setBulkConfirming] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)

  // 削除のUndo（確認ダイアログの代わりに、5秒間だけ取り消せる猶予を挟む）
  const [pendingDelete, setPendingDelete] = useState<{ ids: string[]; label: string } | null>(null)
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingIdsRef = useRef<string[]>([])

  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function commitDelete(ids: string[]) {
    pendingIdsRef.current = []
    try {
      const res = ids.length === 1
        ? await fetch(`/api/transactions/${ids[0]}`, { method: 'DELETE' })
        : await fetch('/api/transactions/bulk-delete', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids }),
          })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setDeleteError(typeof j.error === 'string' ? j.error : '削除に失敗しました。一覧を再読み込みします。')
      }
    } catch {
      setDeleteError('通信エラーで削除できませんでした。')
    } finally {
      // 失敗時も invalidate して実際のDB状態に一覧を合わせる（silent failure で行が幽霊化しない）
      qc.invalidateQueries({ queryKey: ['transactions'] })
    }
  }

  useEffect(() => {
    pendingIdsRef.current = pendingDelete?.ids ?? []
  }, [pendingDelete])

  // リロード・タブclose時は保留中の削除を keepalive fetch で確定させる
  // （unmount cleanupはSPA内遷移しか拾えず、「削除しました」表示後にリロードで復活していた）
  useEffect(() => {
    const flush = () => {
      const ids = pendingIdsRef.current
      if (!ids.length) return
      pendingIdsRef.current = []
      if (ids.length === 1) {
        fetch(`/api/transactions/${ids[0]}`, { method: 'DELETE', keepalive: true }).catch(() => {})
      } else {
        fetch('/api/transactions/bulk-delete', {
          method: 'DELETE', keepalive: true,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        }).catch(() => {})
      }
    }
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [])

  // アンマウント時（画面遷移等）は保留中の削除を即確定させる（消え忘れ防止）
  useEffect(() => () => {
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current)
    if (pendingIdsRef.current.length) commitDelete(pendingIdsRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function scheduleDelete(ids: string[], label: string) {
    if (!ids.length) return
    // 既に保留中の削除があれば即確定してから新しい保留を開始（Undoは常に直近1件分のみ）
    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current)
      if (pendingIdsRef.current.length) commitDelete(pendingIdsRef.current)
    }
    setPendingDelete({ ids, label })
    pendingTimerRef.current = setTimeout(() => {
      commitDelete(ids)
      setPendingDelete(null)
      pendingTimerRef.current = null
    }, UNDO_DELAY_MS)
  }

  function undoDelete() {
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current)
    pendingTimerRef.current = null
    setPendingDelete(null)
  }

  function toggleSelect(tx: Transaction) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(tx.id)) next.delete(tx.id); else next.add(tx.id)
      return next
    })
  }
  function exitSelectMode() {
    setSelectMode(false)
    setSelectedIds(new Set())
    setBulkConfirming(false)
  }
  async function handleBulkDeleteClick() {
    if (!selectedIds.size) return
    if (selectedIds.size >= BULK_CONFIRM_THRESHOLD && !bulkConfirming) {
      setBulkConfirming(true)
      return
    }
    setBulkBusy(true)
    try {
      scheduleDelete([...selectedIds], `${selectedIds.size}件`)
      // 選択されていた行は一覧から即座に消えるため、選択状態はここでクリアしてよい
      exitSelectMode()
    } finally {
      setBulkBusy(false)
    }
  }

  const [classifyError, setClassifyError] = useState<string | null>(null)

  async function handleClassify() {
    setClassifying(true)
    setClassifyResult(null)
    setClassifyError(null)
    try {
      const res  = await fetch('/api/transactions/classify', { method: 'POST' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(typeof j.error === 'string' ? j.error : 'AI分類に失敗しました')
      }
      const data = await res.json() as { classified: number; total: number }
      setClassifyResult(data)
      qc.invalidateQueries({ queryKey: ['transactions'] })
    } catch (err) {
      setClassifyError(err instanceof Error ? err.message : 'AI分類に失敗しました')
    } finally {
      setClassifying(false)
    }
  }

  const apiUrl = (() => {
    const sp = new URLSearchParams()
    if (filters.from || filters.to) {
      if (filters.from) sp.set('from', filters.from)
      if (filters.to)   sp.set('to', filters.to)
    } else {
      sp.set('month', month)
    }
    if (filters.q)   sp.set('q', filters.q)
    if (filters.cat) sp.set('cat', filters.cat)
    if (filters.min) sp.set('min', filters.min)
    if (filters.max) sp.set('max', filters.max)
    return `/api/transactions?${sp.toString()}`
  })()

  const { data: txRes, isLoading } = useQuery<{ data: Transaction[] }>({
    queryKey: ['transactions', month, filters.q, filters.cat, filters.dir, filters.from, filters.to, filters.min, filters.max],
    queryFn:  () => fetch(apiUrl).then((r) => { if (!r.ok) throw new Error('取得に失敗しました'); return r.json() }),
    // フィルタ・月変更時に前回データを保持し、全画面スケルトン化とフォーカス喪失を防ぐ
    placeholderData: keepPreviousData,
  })
  const { data: catRes } = useQuery<{ data: Category[] }>({
    queryKey: ['categories'],
    queryFn:  () => fetch('/api/categories').then((r) => { if (!r.ok) throw new Error('取得に失敗しました'); return r.json() }),
  })

  // 前月比較用（フィルタなし・カレンダー切替に関わらず軽量に取得。比較目的のみなので合計しか使わない）
  const prevMonth = prevMonthOf(month)
  const { data: prevTxRes } = useQuery<{ data: Transaction[] }>({
    queryKey: ['transactions', prevMonth, 'summary-only'],
    queryFn:  () => fetch(`/api/transactions?month=${prevMonth}`).then((r) => { if (!r.ok) throw new Error('取得に失敗しました'); return r.json() }),
    enabled: !hasFilter,
    staleTime: 5 * 60_000,
  })

  const rawTransactions = txRes?.data ?? []
  const transactions = (filters.dir
    ? rawTransactions.filter((tx) => filters.dir === 'expense' ? tx.amount < 0 : tx.amount > 0)
    : rawTransactions
  ).filter((tx) => !pendingDelete?.ids.includes(tx.id)) // Undo猶予中の取引は即座に一覧から隠す
  const allCats      = catRes?.data ?? []

  // 集計除外（MoneyForward方式）: excluded な取引は一覧には薄く残すが、
  // 合計・残高・カテゴリ別集計には含めない
  const aggregatable = transactions.filter((tx) => !tx.excluded)

  const totalIncome  = aggregatable.filter((tx) => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0)
  const totalExpense = aggregatable.filter((tx) => tx.amount < 0).reduce((s, tx) => s + Math.abs(tx.amount), 0)
  const balance      = totalIncome - totalExpense

  const prevAggregatable = (prevTxRes?.data ?? []).filter((tx) => !tx.excluded)
  const prevIncome  = prevAggregatable.filter((tx) => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0)
  const prevExpense = prevAggregatable.filter((tx) => tx.amount < 0).reduce((s, tx) => s + Math.abs(tx.amount), 0)

  const actualByCategory: Record<string, number> = {}
  for (const tx of aggregatable) {
    if (tx.amount >= 0) continue
    const name = tx.categories?.name ?? 'その他'
    actualByCategory[name] = (actualByCategory[name] ?? 0) + Math.abs(tx.amount)
  }
  // カテゴリマスタの登録順で固定表示（使用金額順に毎月並び替えると指の記憶が使えなくなるため）
  const catOrder = new Map(allCats.map((c, i) => [c.name, i]))
  const categories = Object.entries(actualByCategory)
    .map(([name, used], i) => {
      const catMeta = allCats.find((c) => c.name === name)
      return { id: catMeta?.id ?? '', name, color: catMeta?.color ?? CAT_COLORS[i % CAT_COLORS.length], used }
    })
    .sort((a, b) => (catOrder.get(a.name) ?? 999) - (catOrder.get(b.name) ?? 999))

  function handleRefresh() {
    qc.invalidateQueries({ queryKey: ['transactions'] })
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton variant="panel" className="h-16"/>
        <Skeleton variant="panel" className="h-32"/>
        <Skeleton variant="panel" className="h-64"/>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── Dialogs ── */}
      {editingTx && (
        <EditDialog
          tx={editingTx} categories={allCats}
          onClose={() => setEditingTx(null)}
          onSaved={() => { handleRefresh(); setEditingTx(null) }}
        />
      )}

      {/* ── Undoトースト ── */}
      {pendingDelete && (
        <div style={{
          position: 'fixed', left: '50%', bottom: 'calc(env(safe-area-inset-bottom, 12px) + 76px)',
          transform: 'translateX(-50%)', zIndex: 70,
          display: 'flex', alignItems: 'center', gap: 12,
          background: KAI.dropdownBg, border: `1px solid ${KAI.borderStrong}`,
          borderRadius: 14, padding: '10px 10px 10px 16px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
          width: 'min(340px, calc(100vw - 32px))',
        }}>
          <span style={{ flex: 1, fontSize: 12.5, color: KAI.text1 }}>{pendingDelete.label}を削除しました</span>
          <button
            type="button"
            onClick={undoDelete}
            style={{
              fontSize: 12, fontWeight: 700, padding: '7px 12px', borderRadius: 9,
              background: 'rgba(122,167,255,.14)', border: '1px solid rgba(122,167,255,.3)',
              color: KAI.blue, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}
          >
            元に戻す
          </button>
        </div>
      )}

      {/* ── 削除失敗トースト ── */}
      {deleteError && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(251,113,133,.08)', border: `1px solid ${KAI.danger}44`,
          borderRadius: 12, padding: '9px 13px',
        }}>
          <span style={{ flex: 1, fontSize: 12, color: KAI.danger }}>{deleteError}</span>
          <button
            type="button" onClick={() => setDeleteError(null)}
            style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, background: KAI.overlayWeak, border: `1px solid ${KAI.border2}`, color: KAI.text3, cursor: 'pointer', fontFamily: 'inherit' }}
          >閉じる</button>
        </div>
      )}

      {/* ══════ Header Area ══════ */}

      {/* Title + view toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: KAI.text1 }}>収支</div>
        <ViewToggle view={view} onChange={setView} />
      </div>

      {/* Search bar (always visible) */}
      {view === 'list' && !selectMode && (
        <div
          onClick={() => setShowFilters((v) => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: showFilters ? KAI.border2 : KAI.overlayWeak,
            border: `1px solid ${showFilters ? KAI.borderStrong : KAI.border}`,
            borderRadius: 12, padding: '9px 13px', cursor: 'pointer',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={KAI.text3} strokeWidth="1.8"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
          <span style={{ flex: 1, fontSize: 13, color: KAI.text4 }}>取引を検索…</span>
          {showFilters && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={KAI.text4} strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          )}
        </div>
      )}

      {/* Filters (expanded) */}
      {view === 'list' && !selectMode && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1 }}><DuplicateChecker /></div>
          <button
            type="button"
            onClick={() => setSelectMode(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 10,
              border: `1px solid ${KAI.border2}`, background: KAI.overlayWeak,
              color: KAI.text3, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            選択
          </button>
        </div>
      )}
      {view === 'list' && !selectMode && showFilters && <TransactionFilters categories={allCats} />}

      {/* 選択モードバー */}
      {selectMode && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(251,113,133,.06)', border: `1px solid ${KAI.danger}33`,
          borderRadius: 12, padding: '9px 13px',
        }}>
          <span style={{ flex: 1, fontSize: 13, color: KAI.text1, fontWeight: 600 }}>{selectedIds.size}件選択中</span>
          {!bulkConfirming ? (
            <>
              <button
                type="button" onClick={exitSelectMode}
                style={{ fontSize: 12, padding: '7px 12px', borderRadius: 9, background: KAI.overlayWeak, border: `1px solid ${KAI.border2}`, color: KAI.text3, cursor: 'pointer', fontFamily: 'inherit' }}
              >キャンセル</button>
              <button
                type="button" onClick={handleBulkDeleteClick} disabled={!selectedIds.size || bulkBusy}
                style={{
                  fontSize: 12, fontWeight: 700, padding: '7px 12px', borderRadius: 9,
                  background: 'rgba(251,113,133,.16)', border: `1px solid ${KAI.danger}4d`,
                  color: KAI.danger, cursor: selectedIds.size ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
                  opacity: selectedIds.size ? 1 : 0.5,
                }}
              >削除</button>
            </>
          ) : (
            <>
              <span style={{ fontSize: 11.5, color: KAI.text2 }}>{selectedIds.size}件を本当に削除しますか？</span>
              <button
                type="button" onClick={() => setBulkConfirming(false)}
                style={{ fontSize: 12, padding: '7px 12px', borderRadius: 9, background: KAI.overlayWeak, border: `1px solid ${KAI.border2}`, color: KAI.text3, cursor: 'pointer', fontFamily: 'inherit' }}
              >やめる</button>
              <button
                type="button" onClick={handleBulkDeleteClick} disabled={bulkBusy}
                style={{ fontSize: 12, fontWeight: 700, padding: '7px 12px', borderRadius: 9, background: KAI.danger, border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', opacity: bulkBusy ? 0.6 : 1 }}
              >{bulkBusy ? '実行中…' : '削除する'}</button>
            </>
          )}
        </div>
      )}

      {/* Month Switcher */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <MonthSwitcher currentMonth={month} />
      </div>

      {/* Summary Chips */}
      <SummaryChips
        income={totalIncome} expense={totalExpense} balance={balance}
        prevIncome={!hasFilter ? prevIncome : undefined}
        prevExpense={!hasFilter ? prevExpense : undefined}
      />

      {/* AI auto-classify button (shown only when uncategorized exist) */}
      {view === 'list' && classifyError && (
        <p style={{ fontSize: 11.5, color: KAI.danger, margin: 0, padding: '0 2px' }}>{classifyError}</p>
      )}
      {view === 'list' && (() => {
        const BAD = ['未分類', 'その他', '不明']
        const uncategorized = transactions.filter((t) => !t.category_id || BAD.includes(t.categories?.name ?? '')).length
        if (uncategorized === 0 && !classifyResult) return null
        return (
          <button
            type="button"
            onClick={handleClassify}
            disabled={classifying}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              width: '100%', padding: '8px 12px', borderRadius: 10, border: 'none',
              cursor: classifying ? 'not-allowed' : 'pointer',
              background: classifyResult ? 'rgba(74,222,128,.12)' : 'rgba(251,191,36,.12)',
              color: classifyResult ? KAI.success : KAI.warning,
              fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
              opacity: classifying ? 0.6 : 1,
            }}
          >
            {classifying ? (
              <><span style={{ width: 8, height: 8, borderRadius: '50%', background: KAI.warning, animation: 'kai-blink 1s steps(2) infinite', display: 'inline-block' }}/>分類中…</>
            ) : classifyResult ? (
              `✓ ${classifyResult.classified}件分類済`
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 6v6l4 2"/><path d="M22 2 12 12"/></svg>
                未分類 {uncategorized}件をAI自動分類
              </>
            )}
          </button>
        )
      })()}

      {/* Category filter chips */}
      {view === 'list' && categories.length > 0 && (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
          {[
            { key: 'all', label: 'すべて', color: KAI.coral, param: 'cat', value: '' },
            { key: 'expense', label: '支出', color: KAI.danger, param: 'dir', value: 'expense' },
            { key: 'income', label: '収入', color: KAI.success, param: 'dir', value: 'income' },
            ...categories.slice(0, 8).map(c => ({ key: c.id, label: c.name, color: c.color, param: 'cat', value: c.id })),
          ].map(chip => {
            const isActive = chip.key === 'all'
              ? !filters.cat && !filters.dir
              : chip.param === 'dir' ? filters.dir === chip.value : filters.cat === chip.value
            return (
              <button
                key={chip.key}
                onClick={() => {
                  const sp = new URLSearchParams(searchParams.toString())
                  if (chip.key === 'all') { sp.delete('cat'); sp.delete('dir') }
                  else if (isActive) { sp.delete(chip.param) }
                  else { sp.set(chip.param, chip.value); if (chip.param === 'dir') sp.delete('cat'); else sp.delete('dir') }
                  router.push(`?${sp.toString()}`, { scroll: false })
                }}
                style={{
                  borderRadius: 20, padding: '5px 12px', fontSize: 11, fontWeight: 600,
                  whiteSpace: 'nowrap', cursor: 'pointer', fontFamily: 'inherit',
                  background: isActive ? `${chip.color}1c` : KAI.overlayWeak,
                  border: `1px solid ${isActive ? `${chip.color}66` : KAI.border}`,
                  color: isActive ? chip.color : KAI.text3,
                }}
              >{chip.label}</button>
            )
          })}
        </div>
      )}

      {/* ══════ Content ══════ */}

      {view === 'calendar' ? (
        <div className="overflow-hidden">
          <CalendarView transactions={transactions} categories={allCats} month={month} onEdit={setEditingTx} />
        </div>
      ) : (
        <>
          {/* ── Filter results (flat list) ── */}
          {hasFilter && (
            <section style={{
              background: KAI.overlayWeak, border: `1px solid ${KAI.border}`,
              borderRadius: 14, overflow: 'hidden',
            }}>
              <div style={{ padding: '10px 14px', borderBottom: `1px solid ${KAI.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 11, color: KAI.text3, fontWeight: 700, letterSpacing: '.08em' }}>検索結果</span>
                <span style={{ fontSize: 11, color: KAI.text4, ...MONO }}>{transactions.length} 件</span>
              </div>
              {transactions.length === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                  <p style={{ fontSize: 13, color: KAI.text3, margin: 0 }}>該当する取引がありません</p>
                </div>
              ) : (
                transactions.slice(0, 100).map((t, i) => (
                  <div key={t.id} style={{ borderBottom: i < Math.min(transactions.length, 100) - 1 ? `1px solid ${KAI.border}` : 'none' }}>
                    <TransactionRow
                      tx={t} compact rowBg={KAI.overlayWeak}
                      onEdit={setEditingTx}
                      onDeleteRequest={(tx) => scheduleDelete([tx.id], `「${tx.payee}」`)}
                      selectMode={selectMode} selected={selectedIds.has(t.id)} onToggleSelect={toggleSelect}
                    />
                  </div>
                ))
              )}
              {transactions.length > 100 && (
                <div style={{ padding: '8px 14px', textAlign: 'center', fontSize: 11, color: KAI.text4 }}>上位 100 件を表示中</div>
              )}
            </section>
          )}

          {/* ── Transaction list by date ── */}
          {!hasFilter && (
            <>
              {(() => {
                const grouped: Record<string, Transaction[]> = {}
                for (const tx of transactions) {
                  const d = tx.occurred_on.slice(0, 10)
                  if (!grouped[d]) grouped[d] = []
                  grouped[d].push(tx)
                }
                const days = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

                if (days.length === 0) {
                  return (
                    <div style={{
                      background: KAI.overlayWeak, border: `1px solid ${KAI.border}`,
                      borderRadius: 16, padding: '40px 20px', textAlign: 'center',
                    }}>
                      <p style={{ fontSize: 14, color: KAI.text3 }}>取引がありません</p>
                    </div>
                  )
                }

                return days.map(dateStr => {
                  const dayTxs = grouped[dateStr]
                  const d = new Date(dateStr + 'T00:00:00')
                  const dow = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()]
                  const label = `${parseInt(dateStr.slice(5, 7))}月${parseInt(dateStr.slice(8))}日（${dow}）`

                  return (
                    <div key={dateStr}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: KAI.text3, letterSpacing: '.04em', padding: '12px 2px 8px' }}>
                        {label}
                      </div>
                      <div style={{
                        background: KAI.cardBg, border: `1px solid ${KAI.border2}`,
                        borderRadius: 16, overflow: 'hidden',
                      }}>
                        {dayTxs.map((t, i) => (
                          <div key={t.id} style={{ borderBottom: i < dayTxs.length - 1 ? `1px solid ${KAI.border}` : 'none' }}>
                            <TransactionRow
                              tx={t} rowBg={KAI.cardBg}
                              onEdit={setEditingTx}
                              onDeleteRequest={(tx) => scheduleDelete([tx.id], `「${tx.payee}」`)}
                              selectMode={selectMode} selected={selectedIds.has(t.id)} onToggleSelect={toggleSelect}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })
              })()}
            </>
          )}

        </>
      )}
    </div>
  )
}
