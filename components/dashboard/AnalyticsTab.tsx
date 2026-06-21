'use client'

import { useState, useMemo, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  AreaChart, Area, BarChart, Bar, Cell,
  PieChart, Pie,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import type { Transaction } from '@/lib/types'
import { KAI } from '@/lib/kai-tokens'
import { MonthSwitcher } from './MonthSwitcher'
import {
  UP, DOWN, CORAL, TEXT, TEXT2, TEXT3, BORDER, MONO_FONT, panel, pickColor,
  fmt, fmtK, buildMonthlyData, buildCategoryData, buildMoMData,
  buildPayeeData, buildDailyPattern, buildSavingsTrend, buildDiscretionaryTrend, TooltipDark,
} from './dashboard-utils'

function TabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        fontSize: 13, fontWeight: 600, padding: '10px 16px', borderRadius: 10,
        border: 'none', cursor: 'pointer', fontFamily: 'inherit',
        transition: 'all .2s',
        background: active ? `${KAI.coral}18` : 'transparent',
        color: active ? KAI.coral : TEXT3,
        ...(active ? { boxShadow: `0 0 0 1px ${KAI.coral}30` } : {}),
      }}
    >
      {label}
    </button>
  )
}

/* ━━━ 月次分析: 当月のカテゴリ内訳・ランキング・先月比・曜日パターン ━━━ */
function MonthlyView({ allTransactions, currentMonth }: { allTransactions: Transaction[]; currentMonth: string }) {
  const searchParams = useSearchParams()
  const month = searchParams.get('detail_month') ?? currentMonth

  const [donutSelection, setDonutSelection] = useState<{ month: string; idx: number } | null>(null)

  const monthTx = useMemo(() => allTransactions.filter((t) => t.occurred_on.startsWith(month)), [allTransactions, month])
  const categoryData = useMemo(() => buildCategoryData(monthTx), [monthTx])
  const donutData = useMemo(() => categoryData.map(([name, { amount, color }]) => ({ name, value: amount, color })), [categoryData])
  const donutTotal = useMemo(() => donutData.reduce((s, d) => s + d.value, 0), [donutData])

  const activeDonutIdx = donutSelection && donutSelection.month === month && donutSelection.idx < donutData.length
    ? donutSelection.idx : null
  const setActiveDonutIdx = useCallback((idx: number | null) => {
    setDonutSelection(idx !== null ? { month, idx } : null)
  }, [month])

  const rankData = useMemo(() => [...categoryData].slice(0, 6).map(([name, { amount, color }]) => ({ name, amount, color })), [categoryData])
  const momData = useMemo(() => buildMoMData(allTransactions, month), [allTransactions, month])
  const payeeData = useMemo(() => buildPayeeData(allTransactions, month), [allTransactions, month])
  const dailyPattern = useMemo(() => buildDailyPattern(allTransactions, month), [allTransactions, month])

  const handleDonutClick = useCallback((_: unknown, index: number) => {
    setDonutSelection((prev) => prev && prev.month === month && prev.idx === index ? null : { month, idx: index })
  }, [month])

  const activeItem = activeDonutIdx !== null && activeDonutIdx < donutData.length
    ? donutData[activeDonutIdx]
    : null
  const activePct = activeItem && donutTotal > 0 ? ((activeItem.value / donutTotal) * 100).toFixed(1) : null

  return (
    <div className="space-y-3">
      {/* month switcher */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
        <MonthSwitcher currentMonth={month} paramName="detail_month" />
      </div>

      {/* category donut + MoM */}
      <div className="kai-rise grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {/* donut */}
        <div className="rounded-[18px] p-4" style={panel}>
          <p style={{ fontSize: 11, color: TEXT3, letterSpacing: '.08em', fontWeight: 700, marginBottom: 8 }}>カテゴリ内訳</p>
          {donutData.length === 0 ? (
            <p style={{ padding: '16px 0', textAlign: 'center', fontSize: 13, color: TEXT3 }}>データなし</p>
          ) : (
            <div style={{ position: 'relative' }}>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={2}
                    stroke="none"
                    onClick={handleDonutClick}
                    style={{ cursor: 'pointer' }}
                  >
                    {donutData.map((d, i) => (
                      <Cell
                        key={i}
                        fill={d.color}
                        fillOpacity={activeDonutIdx !== null && activeDonutIdx !== i ? 0.3 : 1}
                        stroke={activeDonutIdx === i ? d.color : 'none'}
                        strokeWidth={activeDonutIdx === i ? 2 : 0}
                      />
                    ))}
                  </Pie>
                  {activeDonutIdx === null && (
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const d = payload[0].payload as { name: string; value: number; color: string }
                        const pct = donutTotal > 0 ? ((d.value / donutTotal) * 100).toFixed(1) : '0'
                        return (
                          <div style={{ background: KAI.overlayBg, backdropFilter: 'blur(20px)', border: `1px solid ${KAI.borderStrong}`, borderRadius: 10, padding: '8px 12px', fontSize: 12 }}>
                            <p style={{ color: d.color, fontWeight: 600 }}>{d.name}</p>
                            <p style={{ fontFamily: MONO_FONT, color: TEXT }}>{fmt(d.value)} ({pct}%)</p>
                          </div>
                        )
                      }}
                    />
                  )}
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
                {activeItem ? (
                  <>
                    <p style={{ fontFamily: MONO_FONT, fontSize: 14, fontWeight: 700, color: activeItem.color }}>{fmt(activeItem.value)}</p>
                    <p style={{ fontSize: 10, fontWeight: 600, color: activeItem.color }}>{activeItem.name}</p>
                    <p style={{ fontFamily: MONO_FONT, fontSize: 10, color: TEXT3 }}>{activePct}%</p>
                  </>
                ) : (
                  <>
                    <p style={{ fontFamily: MONO_FONT, fontSize: 15, fontWeight: 700, color: TEXT }}>{fmtK(donutTotal)}</p>
                    <p style={{ fontSize: 9, color: TEXT3 }}>支出合計</p>
                  </>
                )}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 6px', marginTop: 6 }}>
            {donutData.slice(0, 6).map((d, i) => (
              <button
                key={d.name}
                type="button"
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer',
                  opacity: activeDonutIdx !== null && activeDonutIdx !== i ? 0.4 : 1,
                  transition: 'opacity .15s',
                  padding: '5px 8px', borderRadius: 6, border: 'none',
                  background: activeDonutIdx === i ? `${d.color}18` : 'transparent',
                  fontFamily: 'inherit',
                }}
                onClick={() => setActiveDonutIdx(activeDonutIdx === i ? null : i)}
              >
                <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: activeDonutIdx === i ? d.color : TEXT3 }}>{d.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* MoM */}
        <div className="rounded-[18px] p-4" style={panel}>
          <p style={{ fontSize: 11, color: TEXT3, letterSpacing: '.08em', fontWeight: 700, marginBottom: 12 }}>先月比</p>
          {momData.length === 0 ? (
            <p style={{ padding: '16px 0', textAlign: 'center', fontSize: 13, color: TEXT3 }}>データなし</p>
          ) : (
            <div>
              {momData.map((row, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < momData.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                  <span style={{ fontSize: 12, color: TEXT2, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                    <span style={{ fontFamily: MONO_FONT, fontSize: 12, fontWeight: 600, color: row.diff > 0 ? DOWN : UP }}>
                      {row.diff > 0 ? '+' : ''}{fmtK(row.diff)}
                    </span>
                    <span style={{ fontFamily: MONO_FONT, fontSize: 11, padding: '2px 6px', borderRadius: 99, background: row.diff > 0 ? 'rgba(251,113,133,.12)' : 'rgba(74,222,128,.12)', color: row.diff > 0 ? DOWN : UP, border: `1px solid ${row.diff > 0 ? 'rgba(251,113,133,.25)' : 'rgba(74,222,128,.25)'}`, fontWeight: 600 }}>
                      {row.diff > 0
                        ? <svg width="8" height="8" viewBox="0 0 8 8" fill="none" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 1 }}><path d="M4 1L7 7H1L4 1Z" fill="currentColor"/></svg>
                        : <svg width="8" height="8" viewBox="0 0 8 8" fill="none" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 1 }}><path d="M4 7L1 1H7L4 7Z" fill="currentColor"/></svg>
                      }{Math.abs(row.pct)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* category ranking + store ranking */}
      <div className="kai-rise grid grid-cols-1 gap-2.5 sm:grid-cols-2" style={{ animationDelay: '60ms' }}>
        {/* category ranking */}
        <div className="rounded-[18px] p-4" style={panel}>
          <p style={{ fontSize: 11, color: TEXT3, letterSpacing: '.08em', fontWeight: 700, marginBottom: 12 }}>カテゴリ別ランキング</p>
          {rankData.length === 0 ? (
            <p style={{ padding: '16px 0', textAlign: 'center', fontSize: 13, color: TEXT3 }}>データなし</p>
          ) : (() => {
            const rankTotal = rankData.reduce((s, r) => s + r.amount, 0)
            return rankData.map(({ name, amount, color }, i) => {
              const pct = rankTotal > 0 ? (amount / rankTotal) * 100 : 0
              return (
                <div key={name} style={{ marginBottom: i < rankData.length - 1 ? 10 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontFamily: MONO_FONT, fontSize: 9.5, fontWeight: 700, color: i === 0 ? color : TEXT3, minWidth: 14, textAlign: 'right' }}>{i + 1}</span>
                    <span style={{ flex: 1, fontSize: 12, color: TEXT2, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                    <span style={{ fontFamily: MONO_FONT, fontSize: 11, color: TEXT, fontWeight: 600, flexShrink: 0 }}>¥{amount.toLocaleString('ja-JP')}</span>
                  </div>
                  <div style={{ height: 3, background: KAI.border, borderRadius: 99, overflow: 'hidden', marginLeft: 20 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, opacity: i === 0 ? 1 : 0.7 }}/>
                  </div>
                </div>
              )
            })
          })()}
        </div>

        {/* payee ranking */}
        <div className="rounded-[18px] p-4" style={panel}>
          <p style={{ fontSize: 11, color: TEXT3, letterSpacing: '.08em', fontWeight: 700, marginBottom: 12 }}>店舗別ランキング</p>
          {payeeData.length === 0 ? (
            <p style={{ padding: '16px 0', textAlign: 'center', fontSize: 13, color: TEXT3 }}>データなし</p>
          ) : (() => {
            const payeeMax = payeeData[0]?.amount ?? 1
            return payeeData.map(({ name, amount }, i) => {
              const pct = (amount / payeeMax) * 100
              const color = pickColor(name)
              return (
                <div key={name} style={{ marginBottom: i < payeeData.length - 1 ? 10 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontFamily: MONO_FONT, fontSize: 9.5, fontWeight: 700, color: i === 0 ? CORAL : TEXT3, minWidth: 14, textAlign: 'right' }}>{i + 1}</span>
                    <span style={{ flex: 1, fontSize: 12, color: TEXT2, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                    <span style={{ fontFamily: MONO_FONT, fontSize: 11, color: TEXT, fontWeight: 600, flexShrink: 0 }}>¥{amount.toLocaleString('ja-JP')}</span>
                  </div>
                  <div style={{ height: 3, background: KAI.border, borderRadius: 99, overflow: 'hidden', marginLeft: 20 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, opacity: i === 0 ? 1 : 0.6 }}/>
                  </div>
                </div>
              )
            })
          })()}
        </div>
      </div>

      {/* daily spending pattern */}
      <div className="kai-rise rounded-[18px] p-4" style={{ ...panel, animationDelay: '100ms' }}>
        <p style={{ fontSize: 11, color: TEXT3, letterSpacing: '.08em', fontWeight: 700, marginBottom: 14 }}>曜日別パターン</p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={dailyPattern} margin={{ left: -10, right: 4 }}>
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: TEXT3, fontFamily: MONO_FONT }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: TEXT3, fontFamily: MONO_FONT }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={28} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload as { day: string; avg: number; total: number; count: number }
                return (
                  <div style={{ background: KAI.overlayBg, backdropFilter: 'blur(20px)', border: `1px solid ${KAI.borderStrong}`, borderRadius: 10, padding: '8px 12px', fontSize: 12 }}>
                    <p style={{ fontFamily: MONO_FONT, fontWeight: 700, color: TEXT, marginBottom: 4 }}>{label}曜日</p>
                    <p style={{ fontFamily: MONO_FONT, color: CORAL }}>平均: {fmt(d.avg)}</p>
                    <p style={{ fontFamily: MONO_FONT, color: TEXT3 }}>合計: {fmt(d.total)} ({d.count}件)</p>
                  </div>
                )
              }}
            />
            <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
              {dailyPattern.map((d, i) => <Cell key={i} fill={i === 0 || i === 6 ? CORAL : KAI.blue} fillOpacity={0.65} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/* ━━━ 全期間分析: 6ヶ月トレンド（収支・貯蓄率・裁量的支出） ━━━ */
function AllPeriodView({ allTransactions }: { allTransactions: Transaction[] }) {
  const monthlyData = useMemo(() => buildMonthlyData(allTransactions), [allTransactions])
  const savingsTrend = useMemo(() => buildSavingsTrend(allTransactions), [allTransactions])
  const discretionaryTrend = useMemo(() => buildDiscretionaryTrend(allTransactions), [allTransactions])

  return (
    <div className="space-y-3">
      {/* income/expense trend */}
      <div className="kai-rise rounded-[18px] p-[18px]" style={panel}>
        <p style={{ fontSize: 11, color: TEXT3, letterSpacing: '.08em', fontWeight: 700, marginBottom: 14 }}>収支トレンド · 6ヶ月</p>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={monthlyData} margin={{ left: -10, right: 4 }}>
            <defs>
              <linearGradient id="gI" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={UP} stopOpacity={0.35} />
                <stop offset="100%" stopColor={UP} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gE" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={DOWN} stopOpacity={0.35} />
                <stop offset="100%" stopColor={DOWN} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="m" tick={{ fontSize: 10, fill: TEXT3, fontFamily: MONO_FONT }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: TEXT3, fontFamily: MONO_FONT }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`} width={32} />
            <Tooltip content={<TooltipDark />} />
            <Area type="monotone" dataKey="inc" name="収入" stroke={UP}   strokeWidth={2} fill="url(#gI)" dot={false} />
            <Area type="monotone" dataKey="exp" name="支出" stroke={DOWN} strokeWidth={2} fill="url(#gE)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* savings rate + discretionary */}
      <div className="kai-rise grid grid-cols-1 gap-2.5 sm:grid-cols-2" style={{ animationDelay: '60ms' }}>
        {/* savings trend */}
        <div className="rounded-[18px] p-4" style={panel}>
          <p style={{ fontSize: 11, color: TEXT3, letterSpacing: '.08em', fontWeight: 700, marginBottom: 14 }}>貯蓄率推移 · 6ヶ月</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={savingsTrend} margin={{ left: -10, right: 4 }}>
              <XAxis dataKey="m" tick={{ fontSize: 10, fill: TEXT3, fontFamily: MONO_FONT }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: TEXT3, fontFamily: MONO_FONT }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} width={32} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0].payload as { m: string; rate: number; savings: number }
                  return (
                    <div style={{ background: KAI.overlayBg, backdropFilter: 'blur(20px)', border: `1px solid ${KAI.borderStrong}`, borderRadius: 10, padding: '8px 12px', fontSize: 12 }}>
                      <p style={{ fontFamily: MONO_FONT, fontWeight: 700, color: TEXT, marginBottom: 4 }}>{label}月</p>
                      <p style={{ fontFamily: MONO_FONT, color: d.rate >= 0 ? UP : DOWN }}>貯蓄率: {d.rate}%</p>
                      <p style={{ fontFamily: MONO_FONT, color: TEXT3 }}>貯蓄額: {fmt(d.savings)}</p>
                    </div>
                  )
                }}
              />
              <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                {savingsTrend.map((d, i) => <Cell key={i} fill={d.rate >= 0 ? UP : DOWN} fillOpacity={0.7} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* discretionary spending */}
        <div className="rounded-[18px] p-4" style={panel}>
          <p style={{ fontSize: 11, color: TEXT3, letterSpacing: '.08em', fontWeight: 700, marginBottom: 4 }}>裁量的支出 · 6ヶ月</p>
          <p style={{ fontSize: 10, color: TEXT3, marginBottom: 14, opacity: 0.7 }}>
            趣味・嗜好品・課金など
          </p>
          {discretionaryTrend.every((d) => d.total === 0) ? (
            <p style={{ padding: '16px 0', textAlign: 'center', fontSize: 13, color: TEXT3 }}>
              該当カテゴリのデータなし
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={discretionaryTrend} margin={{ left: -10, right: 4 }}>
                <defs>
                  <linearGradient id="gDisc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={KAI.violet} stopOpacity={0.8} />
                    <stop offset="100%" stopColor={KAI.violet} stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="m" tick={{ fontSize: 10, fill: TEXT3, fontFamily: MONO_FONT }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: TEXT3, fontFamily: MONO_FONT }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`} width={32} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0].payload as { m: string; total: number; rate: number; allExp: number }
                    return (
                      <div style={{ background: KAI.overlayBg, backdropFilter: 'blur(20px)', border: `1px solid ${KAI.borderStrong}`, borderRadius: 10, padding: '8px 12px', fontSize: 12 }}>
                        <p style={{ fontFamily: MONO_FONT, fontWeight: 700, color: TEXT, marginBottom: 4 }}>{label}月</p>
                        <p style={{ fontFamily: MONO_FONT, color: KAI.violet }}>裁量的支出: {fmt(d.total)}</p>
                        <p style={{ fontFamily: MONO_FONT, color: TEXT3 }}>変動費全体: {fmt(d.allExp)}</p>
                        <p style={{ fontFamily: MONO_FONT, color: TEXT3 }}>占有率: {d.rate}%</p>
                      </div>
                    )
                  }}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]} fill="url(#gDisc)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}

export function AnalyticsTab({ allTransactions, month }: {
  allTransactions: Transaction[]; month: string
}) {
  const [activeTab, setActiveTab] = useState(0)

  return (
    <div className="space-y-3">
      {/* tab bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '4px', borderRadius: 12,
        background: KAI.overlayWeak,
        border: `1px solid ${BORDER}`,
      }}>
        <TabButton active={activeTab === 0} label="月次分析" onClick={() => setActiveTab(0)} />
        <TabButton active={activeTab === 1} label="全期間分析" onClick={() => setActiveTab(1)} />
      </div>

      {activeTab === 0 ? (
        <MonthlyView allTransactions={allTransactions} currentMonth={month} />
      ) : (
        <AllPeriodView allTransactions={allTransactions} />
      )}
    </div>
  )
}
