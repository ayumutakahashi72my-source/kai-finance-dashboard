'use client'

import { Target } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { KAI, yen } from '@/lib/kai-tokens'
import { Ring } from '@/components/kai/shared'

export interface FinancialGoal {
  id: string
  name: string
  target_amount: number
  deadline: string
  monthly_savings_target: number | null
  monthly_spending_limit: number | null
  risk_level: 'safe' | 'caution' | 'danger' | null
  advice: string | null
  suggested_months_alternative: number | null
  plan_steps: string[] | null
}

interface Props {
  goal: FinancialGoal
  currentMonthExpense: number
  currentMonthIncome: number
  aggregate?: {
    totalCount: number
    totalMonthlySavings: number
    totalSpendingLimit: number | null
  }
}

const RISK = {
  safe:    { label: '達成可能',   color: KAI.success },
  caution: { label: 'やや厳しい', color: KAI.warning },
  danger:  { label: '達成困難',   color: KAI.danger  },
}

function deadlineLabel(deadline: string): string {
  const ms     = new Date(deadline).getTime() - Date.now()
  const months = Math.ceil(ms / (1000 * 60 * 60 * 24 * 30.44))
  if (months <= 0) return '期限切れ'
  const y = Math.floor(months / 12)
  const m = months % 12
  return y === 0 ? `あと ${months} ヶ月` : m === 0 ? `あと ${y} 年` : `あと ${y} 年 ${m} ヶ月`
}

function ringColor(pct: number, invert = false): string {
  if (invert) {
    // 高い方が良い（貯蓄リング）
    if (pct >= 100) return KAI.success
    if (pct >= 70)  return KAI.warning
    return KAI.danger
  }
  // 低い方が良い（支出リング）
  if (pct <= 70)  return KAI.success
  if (pct <= 95)  return KAI.warning
  return KAI.danger
}

// ─── 単一リング + 中央テキスト ───
interface MiniRingProps {
  percent: number
  color: string
  topLabel: string
  centerMain: string
  centerSub: string
  bottomMain: string
  bottomSub: string
}

function MiniRing({ percent, color, topLabel, centerMain, centerSub, bottomMain, bottomSub }: MiniRingProps) {
  const size   = 108
  const stroke = 9
  const clamp  = Math.min(Math.max(percent, 0), 100)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: KAI.text3, letterSpacing: '.07em', margin: 0 }}>
        {topLabel}
      </p>
      <div style={{ position: 'relative', width: size, height: size }}>
        <Ring percent={clamp} size={size} stroke={stroke} color={color} delayMs={300} />
        <div
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 1,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-jetbrains),JetBrains Mono,monospace',
              fontSize: 15, fontWeight: 800, color,
              lineHeight: 1,
            }}
          >
            {centerMain}
          </span>
          <span style={{ fontSize: 8, color: KAI.text4, letterSpacing: '.04em' }}>{centerSub}</span>
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p
          style={{
            fontFamily: 'var(--font-jetbrains),JetBrains Mono,monospace',
            fontSize: 12, fontWeight: 700, color: KAI.text2, margin: '0 0 2px',
          }}
        >
          {bottomMain}
        </p>
        <p style={{ fontSize: 10, color: KAI.text4, margin: 0 }}>{bottomSub}</p>
      </div>
    </div>
  )
}

const panel = {
  background:           KAI.bgPanel,
  backdropFilter:       'blur(24px) saturate(160%)',
  WebkitBackdropFilter: 'blur(24px) saturate(160%)',
  border:               `1px solid ${KAI.border2}`,
  borderRadius:         18,
} as const

export function GoalProgressCard({ goal, currentMonthExpense, currentMonthIncome, aggregate }: Props) {
  const [expanded, setExpanded] = useState(false)

  const risk      = goal.risk_level ? RISK[goal.risk_level] : null
  const limit     = goal.monthly_spending_limit ?? 0
  const savTarget = goal.monthly_savings_target ?? 0

  // リング1: 支出ペース
  const spendPct   = limit > 0 ? Math.round((currentMonthExpense / limit) * 100) : 0
  const spendColor = ringColor(spendPct, false)
  const remaining  = Math.max(0, limit - currentMonthExpense)

  // リング2: 月次貯蓄ペース
  const savings    = Math.max(0, currentMonthIncome - currentMonthExpense)
  const savPct     = savTarget > 0 ? Math.round((savings / savTarget) * 100) : 0
  const savColor   = ringColor(savPct, true)

  const hasCalc = goal.monthly_spending_limit !== null

  return (
    <div style={{ ...panel, padding: '16px 18px', animation: 'kai-rise .5s ease-out both' }}>
      {/* ── header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
          <Target size={18} strokeWidth={2} style={{ color: KAI.coral, flexShrink: 0 }}/>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: KAI.text1, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {goal.name}
            </p>
            <p style={{ fontSize: 10, color: KAI.text4, margin: '2px 0 0', fontFamily: 'var(--font-jetbrains),JetBrains Mono,monospace' }}>
              {yen(goal.target_amount)} · {deadlineLabel(goal.deadline)}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 8 }}>
          {risk && (
            <span
              style={{
                fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 99,
                background: `${risk.color}18`, border: `1px solid ${risk.color}40`, color: risk.color,
              }}
            >
              {risk.label}
            </span>
          )}
          <Link
            href="/settings/goals"
            aria-label="目標を編集"
            style={{
              color: KAI.text3, display: 'flex', alignItems: 'center',
              padding: 4, borderRadius: 6, transition: 'background .15s',
            }}
            className="hover:bg-white/[0.06]"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2l3 3-7 7H2v-3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>
      </div>

      {/* ── 複数目標サマリー ── */}
      {aggregate && (
        <div
          style={{
            marginBottom: 12, padding: '8px 12px', borderRadius: 10,
            background: 'rgba(122,167,255,.06)', border: '1px solid rgba(122,167,255,.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          }}
        >
          <div>
            <p style={{ fontSize: 10, color: KAI.blue, fontWeight: 700, letterSpacing: '.06em', margin: '0 0 2px' }}>
              {aggregate.totalCount} 個の目標を進行中
            </p>
            <p style={{
              fontSize: 11, color: KAI.text3, margin: 0,
              fontFamily: 'var(--font-jetbrains),JetBrains Mono,monospace',
            }}>
              合計月次貯蓄目標 {yen(aggregate.totalMonthlySavings)}
              {aggregate.totalSpendingLimit !== null && (
                <> · 使用可能上限 {yen(aggregate.totalSpendingLimit)}</>
              )}
            </p>
          </div>
          <Link
            href="/settings/goals"
            style={{ fontSize: 11, color: KAI.blue, fontWeight: 600, flexShrink: 0 }}
          >
            すべて見る →
          </Link>
        </div>
      )}

      {/* ── dual rings or CTA ── */}
      {hasCalc && limit <= 0 ? (
        <div
          style={{
            marginBottom: 10, padding: '12px 14px', borderRadius: 10,
            background: 'rgba(251,113,133,.08)', border: '1px solid rgba(251,113,133,.22)',
          }}
        >
          <p style={{ fontSize: 12, color: KAI.danger, fontWeight: 700, margin: '0 0 4px' }}>
            ⚠ 現状の収入では達成が困難です
          </p>
          <p style={{ fontSize: 11, color: KAI.text3, margin: 0, lineHeight: 1.6 }}>
            目標期間を延ばすか、収入を増やす必要があります。
            {goal.suggested_months_alternative && (
              <> AI 提案: <strong style={{ color: KAI.text2 }}>約 {goal.suggested_months_alternative} ヶ月後</strong> が現実的です。</>
            )}
          </p>
        </div>
      ) : hasCalc ? (
        <>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 14 }}>
            {/* 支出リング */}
            <MiniRing
              percent={spendPct}
              color={spendColor}
              topLabel="今月の支出ペース"
              centerMain={`${spendPct}%`}
              centerSub="使用済み"
              bottomMain={yen(remaining)}
              bottomSub={`残り / 上限 ${yen(limit)}`}
            />

            {/* 縦区切り */}
            <div style={{ width: 1, alignSelf: 'center', height: 80, background: 'rgba(255,255,255,.06)' }} />

            {/* 貯蓄リング */}
            <MiniRing
              percent={savPct}
              color={savColor}
              topLabel="月次貯蓄ペース"
              centerMain={`${savPct}%`}
              centerSub="達成率"
              bottomMain={yen(savings)}
              bottomSub={`今月貯蓄 / 目標 ${yen(savTarget)}`}
            />
          </div>

          {/* danger: alternative suggestion */}
          {goal.risk_level === 'danger' && goal.suggested_months_alternative && (
            <div
              style={{
                marginBottom: 10, padding: '8px 12px', borderRadius: 10,
                background: 'rgba(251,113,133,.08)', border: '1px solid rgba(251,113,133,.22)',
              }}
            >
              <p style={{ fontSize: 11, color: KAI.danger, fontWeight: 600, margin: '0 0 3px' }}>
                ⚠ このペースでは達成困難です
              </p>
              <p style={{ fontSize: 11, color: KAI.text3, margin: 0 }}>
                現実的な目安:{' '}
                <strong style={{ color: KAI.text2 }}>
                  約 {goal.suggested_months_alternative} ヶ月後
                </strong>
                （{Math.round((goal.suggested_months_alternative / 12) * 10) / 10} 年）
              </p>
            </div>
          )}

          {/* expandable detail */}
          {(goal.advice || (goal.plan_steps && goal.plan_steps.length > 0)) && (
            <>
              <button
                onClick={() => setExpanded((v) => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: KAI.text3, fontSize: 11, fontWeight: 600, padding: '2px 0', marginBottom: expanded ? 10 : 0,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>
                  <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {expanded ? 'AI詳細を閉じる' : 'AIアドバイスとプランを見る'}
              </button>

              {expanded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {goal.advice && (
                    <p style={{ fontSize: 11, color: KAI.text3, lineHeight: 1.75, margin: 0 }}>
                      {goal.advice}
                    </p>
                  )}
                  {goal.plan_steps && goal.plan_steps.length > 0 && (
                    <div>
                      <p style={{ fontSize: 10, color: KAI.text4, fontWeight: 700, letterSpacing: '.08em', margin: '0 0 6px' }}>
                        PLAN
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {goal.plan_steps.map((step, i) => (
                          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                            <span
                              style={{
                                flexShrink: 0, width: 16, height: 16, borderRadius: 4,
                                background: `${KAI.coral}20`, border: `1px solid ${KAI.coral}40`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 8, fontWeight: 700, color: KAI.coral,
                                fontFamily: 'var(--font-jetbrains),JetBrains Mono,monospace',
                              }}
                            >
                              {i + 1}
                            </span>
                            <span style={{ fontSize: 11, color: KAI.text2, lineHeight: 1.65 }}>{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </>
      ) : (
        /* not yet calculated */
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <p style={{ fontSize: 12, color: KAI.text3, margin: '0 0 10px' }}>
            AI試算を実行すると月次予算が表示されます
          </p>
          <Link href="/settings/goals">
            <button
              style={{
                background: `${KAI.violet}18`, color: KAI.violet,
                border: `1px solid ${KAI.violet}40`, borderRadius: 8,
                padding: '6px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              設定ページで AI試算を実行 →
            </button>
          </Link>
        </div>
      )}
    </div>
  )
}
