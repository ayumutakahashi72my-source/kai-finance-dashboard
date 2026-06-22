'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { KAI } from '@/lib/kai-tokens'
import { useCountUp } from '@/components/kai/hooks'
import { resolveIconName } from '@/lib/category-icons'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { Skeleton } from '@/components/ui/Skeleton'
import { TransactionFilters, readFiltersFromUrl, isFilterActive } from '@/components/transactions/TransactionFilters'
import { EditDialog, DeleteConfirmDialog } from '@/components/transactions/TransactionList'
import { DuplicateChecker } from '@/components/transactions/DuplicateChecker'
import { CalendarView } from '@/components/calendar/CalendarView'
import { MonthSwitcher } from '@/components/dashboard/MonthSwitcher'
import type { Transaction, Category } from '@/lib/types'

const MONO: React.CSSProperties = {
  fontFamily: 'var(--font-jetbrains), "JetBrains Mono", monospace',
}

const CAT_COLORS = [
  KAI.coral, KAI.blue, KAI.violet, KAI.success,
  KAI.warning, KAI.mint, KAI.cyan, KAI.danger,
  KAI.amber, KAI.mintExtra,
]

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

/* ── Summary Chips ─────────────────────────────────────────── */
function SummaryChips({ income, expense, balance }: { income: number; expense: number; balance: number }) {
  const chips: { label: string; value: number; color: string; bgAlpha: string; borderAlpha: string }[] = [
    { label: '収入', value: income, color: KAI.success, bgAlpha: 'rgba(74,222,128,.07)', borderAlpha: 'rgba(74,222,128,.2)' },
    { label: '支出', value: expense, color: KAI.danger, bgAlpha: 'rgba(251,113,133,.07)', borderAlpha: 'rgba(251,113,133,.2)' },
    { label: '残り', value: balance, color: KAI.blue, bgAlpha: 'rgba(122,167,255,.07)', borderAlpha: 'rgba(122,167,255,.2)' },
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
            {c.label === '残り' && c.value >= 0 ? '+' : c.label === '残り' && c.value < 0 ? '' : ''}¥{Math.abs(c.value).toLocaleString('ja-JP')}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Category Filled Icon Display ──────────────────────────── */
function CategoryFilledIcon({ name, size = 14, color }: { name: string; size?: number; color?: string }) {
  const iconName = resolveIconName(name) ?? 'Tag'
  return <CategoryIcon name={iconName} size={size} color={color} />
}

/* ── CategoryBar ───────────────────────────────────────────── */
function CategoryBar({
  name, color, used, totalExpense, idx, onManage,
}: {
  name: string; color: string
  used: number; totalExpense: number; idx: number
  onManage: () => void
}) {
  const pct         = totalExpense > 0 ? Math.min(100, (used / totalExpense) * 100) : 0
  const animatedPct = useCountUp(pct, { duration: 1100, delay: 200 + idx * 55 })
  return (
    <div style={{ padding: '11px 14px', animation: `kai-rise .4s ${.15 + idx * .04}s ease-out both` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 8, flexShrink: 0,
          background: `${color}1c`, border: `1px solid ${color}33`, color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <CategoryFilledIcon name={name} size={14}/>
        </div>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: KAI.text1, flex: 1 }}>{name}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: KAI.text1, ...MONO, letterSpacing: '-.01em' }}>
          ¥{used.toLocaleString('ja-JP')}
        </span>
        <button
          type="button"
          onClick={onManage}
          style={{
            fontSize: 10, fontWeight: 600, color: KAI.coral,
            background: `${KAI.coral}12`, border: `1px solid ${KAI.coral}30`,
            borderRadius: 6, padding: '2px 8px', cursor: 'pointer',
            fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >管理 ›</button>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: KAI.overlayWeak, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${Math.min(100, animatedPct)}%`,
          background: `linear-gradient(90deg, ${color}, ${color}88)`,
          borderRadius: 99,
        }}/>
      </div>
      <div style={{ marginTop: 3, fontSize: 9.5, color: KAI.text4, ...MONO }}>
        支出全体の {Math.round(pct)}%
      </div>
    </div>
  )
}

/* ── TransactionsView (main) ───────────────────────────────── */

interface Props {
  month: string
  initialView?: 'list' | 'calendar'
}

export function TransactionsView({ month, initialView = 'list' }: Props) {
  const router = useRouter()
  const qc     = useQueryClient()
  const searchParams = useSearchParams()
  const filters = readFiltersFromUrl(searchParams)
  const hasFilter = isFilterActive(filters)
  const [showFilters, setShowFilters] = useState(hasFilter)

  const [view, setView] = useState<'list' | 'calendar'>(initialView)
  const [listTab, setListTab] = useState<'transactions' | 'categories'>('transactions')
  const [classifying,    setClassifying]    = useState(false)
  const [classifyResult, setClassifyResult] = useState<{ classified: number; total: number } | null>(null)

  const [editingTx,   setEditingTx]   = useState<Transaction | null>(null)
  const [deletingTx,  setDeletingTx]  = useState<Transaction | null>(null)
  const [menuId,      setMenuId]      = useState<string | null>(null)
  const [menuPos,     setMenuPos]     = useState<{ top: number; right: number } | null>(null)
  const [menuTx,      setMenuTx]      = useState<Transaction | null>(null)

  async function handleClassify() {
    setClassifying(true)
    setClassifyResult(null)
    try {
      const res  = await fetch('/api/transactions/classify', { method: 'POST' })
      if (!res.ok) throw new Error('分類に失敗しました')
      const data = await res.json() as { classified: number; total: number }
      setClassifyResult(data)
      qc.invalidateQueries({ queryKey: ['transactions'] })
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
  })
  const { data: catRes } = useQuery<{ data: Category[] }>({
    queryKey: ['categories'],
    queryFn:  () => fetch('/api/categories').then((r) => { if (!r.ok) throw new Error('取得に失敗しました'); return r.json() }),
  })

  const rawTransactions = txRes?.data ?? []
  const transactions = filters.dir
    ? rawTransactions.filter((tx) => filters.dir === 'expense' ? tx.amount < 0 : tx.amount > 0)
    : rawTransactions
  const allCats      = catRes?.data ?? []

  const totalIncome  = transactions.filter((tx) => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0)
  const totalExpense = transactions.filter((tx) => tx.amount < 0).reduce((s, tx) => s + Math.abs(tx.amount), 0)
  const balance      = totalIncome - totalExpense

  const actualByCategory: Record<string, number> = {}
  for (const tx of transactions) {
    if (tx.amount >= 0) continue
    const name = tx.categories?.name ?? 'その他'
    actualByCategory[name] = (actualByCategory[name] ?? 0) + Math.abs(tx.amount)
  }
  const categories = Object.entries(actualByCategory)
    .map(([name, used], i) => {
      const catMeta = allCats.find((c) => c.name === name)
      return { id: catMeta?.id ?? '', name, color: catMeta?.color ?? CAT_COLORS[i % CAT_COLORS.length], used }
    })
    .sort((a, b) => b.used - a.used)

  function handleRefresh() {
    qc.invalidateQueries({ queryKey: ['transactions'] })
  }

  function openMenu(e: React.MouseEvent, tx: Transaction) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right })
    setMenuTx(tx)
    setMenuId(tx.id)
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
      {deletingTx && (
        <DeleteConfirmDialog
          tx={deletingTx}
          onClose={() => setDeletingTx(null)}
          onDeleted={() => { handleRefresh(); setDeletingTx(null) }}
        />
      )}

      {/* ── Context menu ── */}
      {menuId && menuPos && menuTx && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setMenuId(null)} />
          <div style={{
            position: 'fixed', zIndex: 50,
            top: menuPos.top, right: menuPos.right,
            minWidth: 120, borderRadius: 12,
            background: KAI.dropdownBg,
            border: `1px solid ${KAI.border2}`,
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            overflow: 'hidden',
          }}>
            <button
              onClick={() => { setMenuId(null); setEditingTx(menuTx) }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: KAI.text2, fontFamily: 'inherit' }}
            >✏ 編集</button>
            <div style={{ height: 1, background: KAI.border }} />
            <button
              onClick={() => { setMenuId(null); setDeletingTx(menuTx) }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: KAI.danger, fontFamily: 'inherit' }}
            >🗑 削除</button>
          </div>
        </>
      )}

      {/* ══════ Header Area ══════ */}

      {/* Title + view toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: KAI.text1 }}>収支</div>
        <ViewToggle view={view} onChange={setView} />
      </div>

      {/* Search bar (always visible) */}
      {view === 'list' && (
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
      {view === 'list' && <DuplicateChecker />}
      {view === 'list' && showFilters && <TransactionFilters categories={allCats} />}

      {/* Month Switcher */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <MonthSwitcher currentMonth={month} />
      </div>

      {/* Summary Chips */}
      <SummaryChips income={totalIncome} expense={totalExpense} balance={balance} />

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
          <CalendarView transactions={transactions} categories={allCats} month={month} />
        </div>
      ) : (
        <>
          {/* ── Sub tabs: 明細 / カテゴリ ── */}
          <div style={{ display: 'flex', gap: 4, background: KAI.overlayWeak, borderRadius: 10, padding: 3 }}>
            {([
              { key: 'transactions', label: '明細' },
              { key: 'categories', label: 'カテゴリ' },
            ] as const).map(tab => {
              const active = listTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setListTab(tab.key)}
                  style={{
                    flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                    background: active ? KAI.bgPanel : 'transparent',
                    color: active ? KAI.text1 : KAI.text4,
                    boxShadow: active ? '0 1px 4px rgba(0,0,0,0.2)' : 'none',
                    transition: 'all .15s ease',
                  }}
                >{tab.label}</button>
              )
            })}
          </div>

          {/* ── Filter results (flat list) ── */}
          {listTab === 'transactions' && hasFilter && (
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
                  <div key={t.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px',
                    borderBottom: i < Math.min(transactions.length, 100) - 1 ? `1px solid ${KAI.border}` : 'none',
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: `${t.categories?.color ?? KAI.text3}1c`,
                      border: `1px solid ${t.categories?.color ?? KAI.text3}33`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
                    }}>
                      <CategoryIcon name={resolveIconName(t.categories?.name ?? '') ?? 'Tag'} size={13} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12.5, color: KAI.text2, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.payee}</p>
                      <p style={{ fontSize: 10, color: KAI.text4, margin: '2px 0 0', ...MONO }}>{t.occurred_on} · {t.categories?.name ?? '未分類'}</p>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, ...MONO, flexShrink: 0, color: t.amount < 0 ? KAI.danger : KAI.success }}>
                      {t.amount < 0 ? '−' : '+'}¥{Math.abs(t.amount).toLocaleString('ja-JP')}
                    </span>
                    <button
                      onClick={(e) => { if (menuId === t.id) { setMenuId(null) } else { openMenu(e, t) } }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: KAI.text4, fontSize: 18, padding: '8px 4px', lineHeight: 1, flexShrink: 0, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 2 }}
                      aria-label="メニュー"
                    >⋯</button>
                  </div>
                ))
              )}
              {transactions.length > 100 && (
                <div style={{ padding: '8px 14px', textAlign: 'center', fontSize: 11, color: KAI.text4 }}>上位 100 件を表示中</div>
              )}
            </section>
          )}

          {/* ── Transaction list by date ── */}
          {listTab === 'transactions' && !hasFilter && (
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
                        {dayTxs.map((t, i) => {
                          const catColor = t.categories?.color ?? KAI.text3
                          return (
                            <div key={t.id} style={{
                              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                              borderBottom: i < dayTxs.length - 1 ? `1px solid ${KAI.border}` : 'none',
                            }}>
                              <div style={{
                                width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                                background: `${catColor}1c`, border: `1px solid ${catColor}33`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 18,
                              }}>
                                  <CategoryFilledIcon name={t.categories?.name ?? ''} size={16} />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 500, color: KAI.text1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {t.payee}
                                </div>
                                <div style={{ fontSize: 10, color: KAI.text3, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                  <span>{t.categories?.name ?? '未分類'}</span>
                                  {t.source === 'auto' && (
                                    <>
                                      <span style={{ width: 3, height: 3, borderRadius: '50%', background: KAI.text4, display: 'inline-block' }} />
                                      <span style={{ ...MONO }}>MF同期</span>
                                    </>
                                  )}
                                  {t.source === 'csv' && (
                                    <>
                                      <span style={{ width: 3, height: 3, borderRadius: '50%', background: KAI.text4, display: 'inline-block' }} />
                                      <span style={{ background: `${KAI.violet}1c`, border: `1px solid ${KAI.violet}4d`, borderRadius: 4, padding: '1px 5px', color: KAI.violet, fontSize: 9, fontWeight: 700 }}>CSV</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: t.amount < 0 ? KAI.danger : KAI.success, ...MONO, flexShrink: 0 }}>
                                {t.amount < 0 ? '−' : '+'}¥{Math.abs(t.amount).toLocaleString('ja-JP')}
                              </div>
                              <button
                                onClick={(e) => { if (menuId === t.id) { setMenuId(null) } else { openMenu(e, t) } }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: KAI.text4, fontSize: 18, padding: '8px 4px', lineHeight: 1, flexShrink: 0, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 2 }}
                                aria-label="メニュー"
                              >⋯</button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })
              })()}
            </>
          )}

          {/* ── Category breakdown ── */}
          {listTab === 'categories' && <section style={{ animation: 'kai-rise .5s .1s ease-out both' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: KAI.text4, letterSpacing: '.14em', fontWeight: 700, textTransform: 'uppercase' }}>カテゴリ別</span>
              {(() => {
                const BAD = ['未分類', 'その他', '不明']
                const uncategorized = transactions.filter((t) => !t.category_id || BAD.includes(t.categories?.name ?? '')).length
                if (uncategorized === 0 && !classifyResult) return null
                return (
                  <button
                    type="button"
                    onClick={handleClassify}
                    disabled={classifying}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '7px 12px', borderRadius: 10, border: 'none', cursor: classifying ? 'not-allowed' : 'pointer',
                      background: classifyResult ? 'rgba(74,222,128,.12)' : 'rgba(251,191,36,.12)',
                      color: classifyResult ? KAI.success : KAI.warning,
                      fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                      opacity: classifying ? 0.6 : 1, whiteSpace: 'nowrap',
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
            </div>

            {categories.length > 0 ? (
              <div style={{
                background: KAI.overlayWeak, border: `1px solid ${KAI.border}`,
                borderRadius: 14, overflow: 'hidden',
              }}>
                {categories.map((c, i) => (
                  <div key={c.name} style={{ borderBottom: i < categories.length - 1 ? `1px solid ${KAI.border}` : 'none' }}>
                    <CategoryBar
                      name={c.name} color={c.color}
                      used={c.used} totalExpense={totalExpense} idx={i}
                      onManage={() => router.push(`/budget/category/${encodeURIComponent(c.name)}?month=${month}`)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                background: KAI.overlayWeak, border: `1px solid ${KAI.border}`,
                borderRadius: 14, padding: '32px 20px', textAlign: 'center',
              }}>
                <p style={{ fontSize: 14, color: KAI.text3 }}>支出データがありません</p>
              </div>
            )}
          </section>}
        </>
      )}
    </div>
  )
}
