'use client'

import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { KAI } from '@/lib/kai-tokens'
import { useCountUp } from '@/components/kai/hooks'
import { getCategoryIcon } from '@/lib/category-icons'
import { Skeleton } from '@/components/ui/Skeleton'
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

  const { data: txRes, isLoading } = useQuery<{ data: Transaction[] }>({
    queryKey: ['transactions', month],
    queryFn:  () => fetch(`/api/transactions?month=${month}`).then((r) => r.json()),
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

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
        <div style={{ marginBottom: 6 }}>
          <span style={{ fontSize: 10, color: KAI.text4, letterSpacing: '.14em', fontWeight: 700, textTransform: 'uppercase' }}>
            カテゴリ別
          </span>
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
