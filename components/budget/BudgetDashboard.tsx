'use client'

import { Sparkles, Pencil, Check, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/Skeleton'
import { useCountUp } from '@/components/kai/hooks'
import { getCategoryIcon } from '@/lib/category-icons'
import { KAI } from '@/lib/kai-tokens'
import { jstMonthStr } from '@/lib/jst'
import { FixedExpenseCard } from '@/components/budget/FixedExpenseCard'
import type { Transaction, Category } from '@/lib/types'

/* ─── types ─────────────────────────────────────────────────────── */

interface Suggestion {
  category_name:    string
  suggested_amount: number
  reason:           string
}
interface BudgetData {
  year:             number
  month:            number
  suggestions:      Suggestion[]
  spending_pattern: { summary: string; habits: string[] }
  created_at:       string
}
interface UserBudget {
  category_name: string
  amount:        number
}

/* ─── helpers ───────────────────────────────────────────────────── */

function currentMonthStr() {
  return jstMonthStr()
}

function prevMonthStr(month: string) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function parseMonth(month: string) {
  const [y, m] = month.split('-').map(Number)
  return { year: y, month: m }
}

const MONO: React.CSSProperties = {
  fontFamily: 'var(--font-jetbrains), "JetBrains Mono", monospace',
}

const CAT_COLORS = [
  KAI.coral, KAI.blue, KAI.violet, KAI.success,
  KAI.warning, KAI.mint, KAI.cyan, KAI.danger,
  KAI.amber, KAI.mintExtra,
]


/* ─── OverallBar (全体収支横棒グラフ) ───────────────────────────── */

function OverallBar({
  label, value, maxValue, color, idx,
}: {
  label: string; value: number; maxValue: number; color: string; idx: number
}) {
  const pct         = maxValue > 0 ? Math.min(100, (value / maxValue) * 100) : 0
  const animatedPct = useCountUp(pct, { duration: 1000, delay: 100 + idx * 150 })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {/* ラベル + 金額 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: '.06em' }}>{label}</span>
        <span style={{ fontSize: 15, fontWeight: 800, color, ...MONO, letterSpacing: '-.02em' }}>
          ¥{value.toLocaleString('ja-JP')}
        </span>
      </div>

      {/* 横棒（全幅） */}
      <div style={{
        width: '100%', height: 12, borderRadius: 99,
        background: 'rgba(255,255,255,.05)', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${animatedPct}%`,
          background: `linear-gradient(90deg, ${color}, ${color}88)`,
          borderRadius: 99,
        }}/>
      </div>
    </div>
  )
}

function CategoryIconDisplay({ name, size = 13, strokeWidth = 1.8 }: { name: string; size?: number; strokeWidth?: number }) {
  const Icon = getCategoryIcon(name)
  // eslint-disable-next-line react-hooks/static-components
  return <Icon size={size} strokeWidth={strokeWidth} />
}

/* ─── CategoryBar (カテゴリ別横棒グラフ) ────────────────────────── */

function CategoryBar({
  cat, idx, totalBudget, onManage,
}: {
  cat: { name: string; color: string; used: number; budget: number }
  idx: number
  totalBudget: number
  onManage: () => void
}) {
  const effectiveBudget = cat.budget > 0 ? cat.budget : totalBudget
  const pct             = effectiveBudget > 0 ? Math.min(100, (cat.used / effectiveBudget) * 100) : 0
  const animatedPct     = useCountUp(pct, { duration: 1100, delay: 200 + idx * 70 })
  const over            = cat.budget > 0 && cat.used > cat.budget
  const barColor        = over ? KAI.danger : cat.color
  return (
    <div style={{
      padding: '11px 14px',
      animation: `kai-rise .4s ${.2 + idx * .04}s ease-out both`,
    }}>
      {/* 上段: アイコン・名前・管理ボタン */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 8, flexShrink: 0,
          background: `${cat.color}1c`, border: `1px solid ${cat.color}33`, color: cat.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <CategoryIconDisplay name={cat.name} size={13} strokeWidth={1.8}/>
        </div>

        <span style={{ fontSize: 12.5, fontWeight: 600, color: KAI.text1, flex: 1 }}>
          {cat.name}
        </span>

        <span style={{ display: 'flex', alignItems: 'baseline', gap: 3, ...MONO }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: over ? KAI.danger : KAI.text1, letterSpacing: '-.01em' }}>
            ¥{cat.used.toLocaleString('ja-JP')}
          </span>
          {cat.budget > 0 && (
            <span style={{ fontSize: 10, color: KAI.text4 }}>/ ¥{cat.budget.toLocaleString('ja-JP')}</span>
          )}
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

      {/* 下段: 横棒グラフ */}
      <div style={{ height: 7, borderRadius: 99, background: 'rgba(255,255,255,.05)', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${Math.min(100, animatedPct)}%`,
          background: over
            ? KAI.danger
            : `linear-gradient(90deg, ${barColor}, ${barColor}88)`,
          borderRadius: 99,
        }}/>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
        <span style={{ fontSize: 9.5, color: KAI.text4, ...MONO }}>
          {cat.budget > 0
            ? `${Math.round(pct)}% · 残 ¥${Math.max(0, cat.budget - cat.used).toLocaleString('ja-JP')}`
            : `支出の ${Math.round(pct)}%`}
        </span>
        {over && (
          <span style={{ fontSize: 9.5, color: KAI.danger, fontWeight: 700 }}>超過</span>
        )}
      </div>
    </div>
  )
}

/* ─── BudgetDashboard ───────────────────────────────────────────── */

export function BudgetDashboard({ month: monthProp }: { month?: string } = {}) {
  const qc     = useQueryClient()
  const router = useRouter()
  const month  = monthProp ?? currentMonthStr()
  const prev   = prevMonthStr(month)

  // 予算編集モード
  const [editMode, setEditMode] = useState(false)
  const [editValues, setEditValues] = useState<Record<string, string>>({})

  /* ─── queries ─── */
  const { data: budgetRes, isLoading: budgetLoading } = useQuery<{ data: BudgetData | null }>({
    queryKey: ['budget_suggest'],
    queryFn:  () => fetch('/api/budget/suggest').then((r) => { if (!r.ok) throw new Error('取得に失敗しました'); return r.json() }),
  })
  const { data: userBudgetsRes, isLoading: userBudgetsLoading } = useQuery<{ budgets: UserBudget[] }>({
    queryKey: ['user_budgets', month],
    queryFn:  () => fetch(`/api/budgets?month=${month}`).then((r) => { if (!r.ok) throw new Error('取得に失敗しました'); return r.json() }),
  })
  const { data: txRes, isLoading: txLoading } = useQuery<{ data: Transaction[] }>({
    queryKey: ['transactions', month],
    queryFn:  () => fetch(`/api/transactions?month=${month}`).then((r) => { if (!r.ok) throw new Error('取得に失敗しました'); return r.json() }),
  })
  const { data: prevTxRes } = useQuery<{ data: Transaction[] }>({
    queryKey: ['transactions', prev],
    queryFn:  () => fetch(`/api/transactions?month=${prev}`).then((r) => { if (!r.ok) throw new Error('取得に失敗しました'); return r.json() }),
  })
  const { data: catRes } = useQuery<{ data: Category[] }>({
    queryKey: ['categories'],
    queryFn:  () => fetch('/api/categories').then((r) => { if (!r.ok) throw new Error('取得に失敗しました'); return r.json() }),
  })

  /* ─── AI generate ─── */
  const { mutate: generateBudget, isPending, error: genError } = useMutation({
    mutationFn: (force: boolean) =>
      fetch(`/api/budget/suggest${force ? '?force=true' : ''}`, { method: 'POST' }).then(async (r) => {
        const j = await r.json()
        if (!r.ok) throw new Error(j.error ?? '生成失敗')
        return j
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budget_suggest'] }),
  })

  /* ─── save user budgets ─── */
  const { mutate: saveBudgets, isPending: isSaving } = useMutation({
    mutationFn: (budgets: UserBudget[]) =>
      fetch('/api/budgets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, budgets }),
      }).then(async (r) => {
        const j = await r.json()
        if (!r.ok) throw new Error(j.error ?? '保存失敗')
        return j
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user_budgets', month] })
      setEditMode(false)
    },
  })

  /* ─── derived ─── */
  const budget       = budgetRes?.data
  const userBudgets  = userBudgetsRes?.budgets ?? []
  const userBudgetMap = new Map(userBudgets.map((b) => [b.category_name, b.amount]))
  const transactions = txRes?.data ?? []
  const prevTxs      = prevTxRes?.data ?? []
  const allCats      = catRes?.data ?? []
  const isLoading    = budgetLoading || txLoading || userBudgetsLoading

  /* 今月の収入・支出 */
  const totalIncome  = transactions.filter((tx) => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0)
  const totalExpense = transactions.filter((tx) => tx.amount < 0).reduce((s, tx) => s + Math.abs(tx.amount), 0)
  const balance      = totalIncome - totalExpense

  /* 先月収入 */
  const prevMonthIncome = prevTxs.filter((tx) => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0)

  /* カテゴリ別支出集計（親カテゴリでロールアップ） */
  const actualByCategory: Record<string, number> = {}
  for (const tx of transactions) {
    if (tx.amount >= 0) continue
    const name = tx.categories?.parent?.name ?? tx.categories?.name ?? 'その他'
    actualByCategory[name] = (actualByCategory[name] ?? 0) + Math.abs(tx.amount)
  }

  /* カテゴリリスト: ユーザー設定 > AI提案 ∪ 実績 */
  const suggestionMap = new Map(
    (budget?.suggestions ?? []).map((s, i) => [s.category_name, { budget: s.suggested_amount, idx: i }])
  )
  const catNames   = new Set([
    ...Array.from(userBudgetMap.keys()),
    ...Array.from(suggestionMap.keys()),
    ...Object.keys(actualByCategory),
  ])
  const categories = Array.from(catNames).map((name, i) => {
    const sug     = suggestionMap.get(name)
    const catMeta = allCats.find((c) => c.name === name)
    const userBudgetAmt = userBudgetMap.get(name)
    return {
      name,
      color:  sug
        ? CAT_COLORS[sug.idx % CAT_COLORS.length]
        : (catMeta?.color ?? CAT_COLORS[i % CAT_COLORS.length]),
      used:   actualByCategory[name] ?? 0,
      budget: userBudgetAmt ?? sug?.budget ?? 0,
    }
  }).sort((a, b) => b.used - a.used)

  /* 合計予算: AI提案合計 → 先月収入 → 支出×1.2 */
  const aiTotal     = budget?.suggestions.reduce((s, x) => s + x.suggested_amount, 0) ?? 0
  const totalBudget = aiTotal > 0
    ? aiTotal
    : prevMonthIncome > 0
      ? prevMonthIncome
      : Math.round(totalExpense * 1.2)

  /* 期間 */
  const { year: mYear, month: mMonth } = parseMonth(month)
  const periodLabel = `${mYear}年${mMonth}月`

  /* AI提案テキスト用：超過カテゴリ */
  const overCat = categories.find((c) => c.budget > 0 && c.used > c.budget)

  /* maxValue for overall bars */
  const overallMax = Math.max(totalIncome, totalExpense, 1)

  /* ─── skeleton ─── */
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton variant="panel" className="h-36"/>
        <Skeleton variant="panel" className="h-64"/>
        <Skeleton variant="panel" className="h-20"/>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── 1. 全体収支横棒グラフ ── */}
      <section style={{
        background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)',
        borderRadius: 18, padding: '16px 18px',
        animation: 'kai-rise .5s ease-out both',
      }}>
        {/* ヘッダー */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <span style={{ fontSize: 10, fontWeight: 700, color: KAI.text4, letterSpacing: '.12em', textTransform: 'uppercase' }}>
              全体収支
            </span>
            <span style={{ fontSize: 11, color: KAI.text4, marginLeft: 8 }}>{periodLabel}</span>
          </div>
          {/* 収支差額バッジ */}
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

        {/* 収入バー */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <OverallBar label="収入" value={totalIncome}  maxValue={overallMax} color={KAI.success} idx={0}/>
          <OverallBar label="支出" value={totalExpense} maxValue={overallMax} color={KAI.danger} idx={1}/>
        </div>

        {/* フッター */}
        {prevMonthIncome > 0 && (
          <div style={{ marginTop: 10, fontSize: 10, color: KAI.text4, ...MONO }}>
            先月収入 ¥{prevMonthIncome.toLocaleString('ja-JP')}
          </div>
        )}
      </section>

      {/* ── 2. カテゴリ別横棒グラフ ── */}
      <section style={{ animation: 'kai-rise .5s .1s ease-out both' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 10, color: KAI.text4, letterSpacing: '.14em', fontWeight: 700, textTransform: 'uppercase' }}>
            カテゴリ別
          </span>
          {!editMode ? (
            <button
              type="button"
              onClick={() => {
                const init: Record<string, string> = {}
                for (const c of categories) init[c.name] = c.budget > 0 ? String(c.budget) : ''
                setEditValues(init)
                setEditMode(true)
              }}
              style={{
                fontSize: 10, fontWeight: 600, color: KAI.text4,
                background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.10)',
                borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            ><Pencil size={10}/> 予算を設定</button>
          ) : (
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                onClick={() => setEditMode(false)}
                style={{
                  fontSize: 10, fontWeight: 600, color: KAI.text4,
                  background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.10)',
                  borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              ><X size={10}/> キャンセル</button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => {
                  const budgets = Object.entries(editValues)
                    .filter(([, v]) => v && parseInt(v, 10) > 0)
                    .map(([category_name, v]) => ({ category_name, amount: parseInt(v, 10) }))
                  if (budgets.length > 0) saveBudgets(budgets)
                  else setEditMode(false)
                }}
                style={{
                  fontSize: 10, fontWeight: 700, color: KAI.bg,
                  background: `linear-gradient(135deg, ${KAI.coral}, ${KAI.blue})`,
                  border: 'none', borderRadius: 6, padding: '3px 10px',
                  cursor: isSaving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: 4, opacity: isSaving ? 0.6 : 1,
                }}
              ><Check size={10}/> {isSaving ? '保存中…' : '保存'}</button>
            </div>
          )}
        </div>

        {categories.length > 0 ? (
          <div style={{
            background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)',
            borderRadius: 14, overflow: 'hidden',
          }}>
            {categories.map((c, i) => (
              <div key={c.name} style={{ borderBottom: i < categories.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none' }}>
                {editMode ? (
                  <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: KAI.text1, flex: 1 }}>{c.name}</span>
                    <span style={{ fontSize: 12, color: KAI.text4, ...MONO }}>¥</span>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={editValues[c.name] ?? ''}
                      onChange={(e) => setEditValues((prev) => ({ ...prev, [c.name]: e.target.value }))}
                      placeholder="未設定"
                      style={{
                        width: 100, fontSize: 13, fontWeight: 600, textAlign: 'right',
                        background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)',
                        borderRadius: 8, padding: '4px 8px', color: KAI.text1, fontFamily: 'var(--font-jetbrains), monospace',
                        outline: 'none',
                      }}
                    />
                  </div>
                ) : (
                  <CategoryBar
                    cat={c} idx={i}
                    totalBudget={totalBudget}
                    onManage={() => router.push(`/budget/category/${encodeURIComponent(c.name)}?month=${month}`)}
                  />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)',
            borderRadius: 14, padding: '32px 20px', textAlign: 'center',
          }}>
            <p style={{ fontSize: 14, color: KAI.text3 }}>支出データがありません</p>
            <p style={{ fontSize: 12, color: KAI.text4, marginTop: 6 }}>
              {month.replace('-', '年') + '月'}に支出の取引がありません
            </p>
          </div>
        )}
      </section>

      {/* ── 3. 固定費候補 ── */}
      <FixedExpenseCard />

      {/* ── 4. AI提案 ── */}
      <section style={{
        background: 'linear-gradient(135deg, rgba(167,139,250,.08), rgba(251,148,119,.04))',
        border: `1px solid ${KAI.violet}2e`,
        borderRadius: 14, padding: '11px 12px',
        display: 'flex', alignItems: 'flex-start', gap: 10,
        animation: 'kai-rise .5s .2s ease-out both',
        marginBottom: 14,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          background: `linear-gradient(135deg, ${KAI.coral}, ${KAI.peach})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: KAI.peach,
        }}><Sparkles size={14} strokeWidth={1.8}/></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, color: KAI.violet, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' }}>
            提案
          </div>

          {budget?.spending_pattern ? (
            <>
              <div style={{ fontSize: 12, color: '#e8e8f0', marginTop: 3, lineHeight: 1.55 }}>
                {overCat ? (
                  <>
                    <span style={{ color: KAI.amber, fontWeight: 700 }}>{overCat.name}</span>
                    {' が '}
                    <span style={{ color: KAI.danger, fontWeight: 700 }}>
                      +¥{(overCat.used - overCat.budget).toLocaleString('ja-JP')} 超過
                    </span>
                    {'。来月は '}
                    <span style={{ color: KAI.coral, fontWeight: 700 }}>
                      ¥{(Math.round(overCat.used * 1.1 / 1000) * 1000).toLocaleString('ja-JP')}
                    </span>
                    {' に調整するのがおすすめ。'}
                  </>
                ) : budget.spending_pattern.summary}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    generateBudget(true)
                    if (budget?.suggestions.length) {
                      saveBudgets(budget.suggestions.map((s) => ({
                        category_name: s.category_name,
                        amount: s.suggested_amount,
                      })))
                    }
                  }}
                  disabled={isPending || isSaving}
                  style={{
                    fontSize: 11, padding: '5px 10px', borderRadius: 8,
                    background: `linear-gradient(135deg, ${KAI.coral}, ${KAI.blue})`,
                    color: KAI.bg, fontWeight: 700, border: 'none',
                    cursor: isPending || isSaving ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit', opacity: isPending || isSaving ? 0.6 : 1,
                  }}
                >{isPending ? '適用中…' : '適用する'}</button>
                <button
                  type="button"
                  style={{
                    fontSize: 11, padding: '5px 10px', borderRadius: 8,
                    background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.12)',
                    color: KAI.text2, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >後で</button>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 12, color: '#e8e8f0', marginTop: 3, lineHeight: 1.55 }}>
                {prevMonthIncome > 0
                  ? <>先月の収入 <span style={{ color: KAI.success, fontWeight: 700 }}>¥{prevMonthIncome.toLocaleString('ja-JP')}</span> をもとに今月の予算を提案します</>
                  : '過去の支出を分析して今月の予算を提案します'}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => generateBudget(false)}
                  disabled={isPending}
                  style={{
                    fontSize: 11, padding: '5px 10px', borderRadius: 8,
                    background: `linear-gradient(135deg, ${KAI.coral}, ${KAI.blue})`,
                    color: KAI.bg, fontWeight: 700, border: 'none',
                    cursor: isPending ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit', opacity: isPending ? 0.6 : 1,
                  }}
                >{isPending ? '生成中…' : '提案を生成'}</button>
              </div>
            </>
          )}

          {genError && (
            <p style={{ fontSize: 11, color: KAI.danger, marginTop: 6 }}>
              {(genError as Error).message}
            </p>
          )}
        </div>
      </section>

    </div>
  )
}
