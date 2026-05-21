'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { KAI } from '@/lib/kai-tokens'
import { useCountUp } from '@/components/kai/hooks'
import { getCategoryIcon } from '@/lib/category-icons'
import { Skeleton } from '@/components/ui/Skeleton'
import { TransactionFilters, readFiltersFromUrl, isFilterActive } from '@/components/transactions/TransactionFilters'
import { EditDialog, DeleteConfirmDialog } from '@/components/transactions/TransactionList'
import { DuplicateChecker } from '@/components/transactions/DuplicateChecker'
import type { Transaction, Category } from '@/lib/types'

/* ─── helpers ─────────────────────────────────────────────────────── */

const MONO: React.CSSProperties = {
  fontFamily: 'var(--font-jetbrains), "JetBrains Mono", monospace',
}

const CAT_COLORS = [
  KAI.coral, KAI.blue, KAI.violet, KAI.success,
  KAI.warning, KAI.mint, KAI.cyan, KAI.danger,
  KAI.amber, KAI.mintExtra,
]

/* ─── BalanceBar: 収入・支出を1本に ──────────────────────────────── */

function BalanceBar({ totalIncome, totalExpense }: { totalIncome: number; totalExpense: number }) {
  const total      = totalIncome + totalExpense || 1
  const incPct     = (totalIncome  / total) * 100
  const expPct     = (totalExpense / total) * 100
  const animatedInc = useCountUp(incPct, { duration: 1000, delay: 100 })
  const animatedExp = useCountUp(expPct, { duration: 1000, delay: 100 })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* 1本の積み上げ横棒 */}
      <div style={{
        width: '100%', height: 20, borderRadius: 99,
        background: 'rgba(255,255,255,.04)',
        overflow: 'hidden', display: 'flex',
      }}>
        {/* 収入（左・緑） */}
        <div style={{
          width: `${animatedInc}%`, height: '100%',
          background: 'linear-gradient(90deg, #4ade80, #22c55e)',
          borderRadius: totalExpense === 0 ? 99 : '99px 0 0 99px',
          borderRight: totalExpense > 0 ? '2px solid rgba(12,10,20,.5)' : 'none',
          transition: 'width 0s',
        }}/>
        {/* 支出（右・赤） */}
        <div style={{
          width: `${animatedExp}%`, height: '100%',
          background: 'linear-gradient(90deg, #f87171, #fb7185)',
          borderRadius: totalIncome === 0 ? 99 : '0 99px 99px 0',
        }}/>
      </div>

      {/* ラベル行 */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: '#4ade80', display: 'inline-block', flexShrink: 0 }}/>
          <span style={{ fontSize: 11, color: KAI.text3, fontWeight: 600 }}>収入</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#4ade80', ...MONO, letterSpacing: '-.01em' }}>
            ¥{totalIncome.toLocaleString('ja-JP')}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#fb7185', ...MONO, letterSpacing: '-.01em' }}>
            ¥{totalExpense.toLocaleString('ja-JP')}
          </span>
          <span style={{ fontSize: 11, color: KAI.text3, fontWeight: 600 }}>支出</span>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: '#fb7185', display: 'inline-block', flexShrink: 0 }}/>
        </div>
      </div>
    </div>
  )
}

/* ─── CategoryBar ─────────────────────────────────────────────────── */

function CategoryBar({
  name, color, used, totalExpense, idx, onManage,
}: {
  name: string; color: string
  used: number; totalExpense: number; idx: number
  onManage: () => void
}) {
  const pct         = totalExpense > 0 ? Math.min(100, (used / totalExpense) * 100) : 0
  const animatedPct = useCountUp(pct, { duration: 1100, delay: 200 + idx * 55 })
  const CatIcon     = getCategoryIcon(name)

  return (
    <div style={{ padding: '11px 14px', animation: `kai-rise .4s ${.15 + idx * .04}s ease-out both` }}>
      {/* 上段: アイコン・名前・金額・管理ボタン */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 8, flexShrink: 0,
          background: `${color}1c`, border: `1px solid ${color}33`, color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <CatIcon size={13} strokeWidth={1.8}/>
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

      {/* 横棒グラフ */}
      <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,.05)', overflow: 'hidden' }}>
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

/* ─── TransactionsView ────────────────────────────────────────────── */


export function TransactionsView({ month }: { month: string }) {
  const router = useRouter()
  const qc     = useQueryClient()
  const searchParams = useSearchParams()
  const filters = readFiltersFromUrl(searchParams)
  const hasFilter = isFilterActive(filters)
  const [classifying,    setClassifying]    = useState(false)
  const [classifyResult, setClassifyResult] = useState<{ classified: number; total: number } | null>(null)

  // 編集・削除
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
      const data = await res.json() as { classified: number; total: number }
      setClassifyResult(data)
      qc.invalidateQueries({ queryKey: ['transactions'] })
    } finally {
      setClassifying(false)
    }
  }

  // URL から API パラメータを構築
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
    queryKey: ['transactions', month, filters.q, filters.cat, filters.from, filters.to, filters.min, filters.max],
    queryFn:  () => fetch(apiUrl).then((r) => r.json()),
  })
  const { data: catRes } = useQuery<{ data: Category[] }>({
    queryKey: ['categories'],
    queryFn:  () => fetch('/api/categories').then((r) => r.json()),
  })

  const transactions = txRes?.data ?? []
  const allCats      = catRes?.data ?? []

  const totalIncome  = transactions.filter((tx) => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0)
  const totalExpense = transactions.filter((tx) => tx.amount < 0).reduce((s, tx) => s + Math.abs(tx.amount), 0)
  const balance      = totalIncome - totalExpense

  /* カテゴリ別支出集計 */
  const actualByCategory: Record<string, number> = {}
  for (const tx of transactions) {
    if (tx.amount >= 0) continue
    const name = tx.categories?.name ?? 'その他'
    actualByCategory[name] = (actualByCategory[name] ?? 0) + Math.abs(tx.amount)
  }

  const categories = Object.entries(actualByCategory)
    .map(([name, used], i) => {
      const catMeta = allCats.find((c) => c.name === name)
      return { name, color: catMeta?.color ?? CAT_COLORS[i % CAT_COLORS.length], used }
    })
    .sort((a, b) => b.used - a.used)

  const [y, m] = month.split('-').map(Number)
  const periodLabel = `${y}年${m}月`

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton variant="panel" className="h-32"/>
        <Skeleton variant="panel" className="h-64"/>
      </div>
    )
  }

  function handleRefresh() {
    qc.invalidateQueries({ queryKey: ['transactions'] })
  }

  function openMenu(e: React.MouseEvent, tx: Transaction) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right })
    setMenuTx(tx)
    setMenuId(tx.id)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── 編集・削除ダイアログ ── */}
      {editingTx && (
        <EditDialog
          tx={editingTx}
          categories={allCats}
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

      {/* ── ⋯ メニュー ── */}
      {menuId && menuPos && menuTx && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setMenuId(null)} />
          <div style={{
            position: 'fixed', zIndex: 50,
            top: menuPos.top, right: menuPos.right,
            minWidth: 120, borderRadius: 12,
            background: 'rgba(20,22,32,0.98)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            overflow: 'hidden',
          }}>
            <button
              onClick={() => { setMenuId(null); setEditingTx(menuTx) }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: KAI.text2, fontFamily: 'inherit' }}
            >✏ 編集</button>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
            <button
              onClick={() => { setMenuId(null); setDeletingTx(menuTx) }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: KAI.danger, fontFamily: 'inherit' }}
            >🗑 削除</button>
          </div>
        </>
      )}

      {/* ── 0. 重複チェック + 検索・フィルタ ── */}
      <DuplicateChecker />
      <TransactionFilters categories={allCats} />

      {/* ── フィルタ active 時は flat list 表示 ── */}
      {hasFilter && (
        <section
          style={{
            background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)',
            borderRadius: 14, overflow: 'hidden',
          }}
        >
          <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 11, color: KAI.text3, fontWeight: 700, letterSpacing: '.08em' }}>
              検索結果
            </span>
            <span style={{ fontSize: 11, color: KAI.text4, ...MONO }}>{transactions.length} 件</span>
          </div>
          {transactions.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: KAI.text3, margin: 0 }}>該当する取引がありません</p>
            </div>
          ) : (
            transactions.slice(0, 100).map((t, i) => (
              <div
                key={t.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px',
                  borderBottom: i < Math.min(transactions.length, 100) - 1 ? '1px solid rgba(255,255,255,.04)' : 'none',
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: `${t.categories?.color ?? KAI.text3}1c`,
                  border: `1px solid ${t.categories?.color ?? KAI.text3}33`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
                }}>
                  {t.categories?.icon ?? '·'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12.5, color: KAI.text2, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.payee}
                  </p>
                  <p style={{ fontSize: 10, color: KAI.text4, margin: '2px 0 0', ...MONO }}>
                    {t.occurred_on} · {t.categories?.name ?? '未分類'}
                  </p>
                </div>
                <span style={{
                  fontSize: 13, fontWeight: 700, ...MONO, flexShrink: 0,
                  color: t.amount < 0 ? KAI.danger : KAI.success,
                }}>
                  {t.amount < 0 ? '−' : '+'}¥{Math.abs(t.amount).toLocaleString('ja-JP')}
                </span>
                <button
                  onClick={(e) => { if (menuId === t.id) { setMenuId(null) } else { openMenu(e, t) } }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: KAI.text4, fontSize: 16, padding: '0 2px', lineHeight: 1, flexShrink: 0 }}
                >⋯</button>
              </div>
            ))
          )}
          {transactions.length > 100 && (
            <div style={{ padding: '8px 14px', textAlign: 'center', fontSize: 11, color: KAI.text4 }}>
              上位 100 件を表示中（条件を絞り込んでください）
            </div>
          )}
        </section>
      )}

      {/* ── 1. 全体収支（1本の横棒） ── */}
      <section style={{
        background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)',
        borderRadius: 18, padding: '16px 18px',
        animation: 'kai-rise .5s ease-out both',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <span style={{ fontSize: 10, fontWeight: 700, color: KAI.text4, letterSpacing: '.12em', textTransform: 'uppercase' }}>
              全体収支
            </span>
            <span style={{ fontSize: 11, color: KAI.text4, marginLeft: 8 }}>{periodLabel}</span>
          </div>
          <span style={{
            fontSize: 12, fontWeight: 700, ...MONO,
            color: balance >= 0 ? KAI.success : KAI.danger,
            background: balance >= 0 ? 'rgba(74,222,128,.10)' : 'rgba(251,113,133,.10)',
            border: `1px solid ${balance >= 0 ? 'rgba(74,222,128,.25)' : 'rgba(251,113,133,.25)'}`,
            borderRadius: 8, padding: '3px 10px',
          }}>
            {balance >= 0 ? '+' : ''}¥{Math.abs(balance).toLocaleString('ja-JP')}
          </span>
        </div>

        <BalanceBar totalIncome={totalIncome} totalExpense={totalExpense}/>
      </section>

      {/* ── 2. カテゴリ別横棒グラフ ── */}
      <section style={{ animation: 'kai-rise .5s .1s ease-out both' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 10, color: KAI.text4, letterSpacing: '.14em', fontWeight: 700, textTransform: 'uppercase' }}>
            カテゴリ別
          </span>
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
            background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)',
            borderRadius: 14, overflow: 'hidden',
          }}>
            {categories.map((c, i) => (
              <div key={c.name} style={{ borderBottom: i < categories.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none' }}>
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
            background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)',
            borderRadius: 14, padding: '32px 20px', textAlign: 'center',
          }}>
            <p style={{ fontSize: 14, color: KAI.text3 }}>支出データがありません</p>
            <p style={{ fontSize: 12, color: KAI.text4, marginTop: 6 }}>{periodLabel}に支出の取引がありません</p>
          </div>
        )}
      </section>


    </div>
  )
}
