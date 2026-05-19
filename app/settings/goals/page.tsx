'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { ChevronLeftIcon, PlusIcon, SparklesIcon, Trash2Icon, PencilIcon, CheckIcon, XIcon, Target } from 'lucide-react'
import { KAI, yen } from '@/lib/kai-tokens'
import type { FinancialGoal } from '@/components/dashboard/GoalProgressCard'

const panel = {
  background:           'rgba(20,22,32,0.75)',
  backdropFilter:       'blur(24px) saturate(160%)',
  WebkitBackdropFilter: 'blur(24px) saturate(160%)',
  border:               '1px solid rgba(255,255,255,0.08)',
  borderRadius:         18,
} as const

const RISK_LABEL = {
  safe:    { label: '達成可能',   color: KAI.success },
  caution: { label: 'やや厳しい', color: KAI.warning },
  danger:  { label: '達成困難',   color: KAI.danger  },
}

function deadlineLabel(deadline: string): string {
  const today  = new Date()
  const target = new Date(deadline)
  const months = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30.44))
  if (months <= 0) return '期限切れ'
  const years = Math.floor(months / 12)
  const rem   = months % 12
  return years === 0
    ? `あと ${months} ヶ月`
    : rem === 0 ? `あと ${years} 年` : `あと ${years} 年 ${rem} ヶ月`
}

/* ─── Deadline input (shared by create & edit) ─── */
interface DeadlineInputProps {
  value: string                      // YYYY-MM-DD (current resolved deadline)
  onChange: (date: string) => void   // resolved YYYY-MM-DD or ''
  initialMode?: 'years' | 'date'
}

function DeadlineInput({ value, onChange, initialMode = 'years' }: DeadlineInputProps) {
  const [mode, setMode] = useState<'years' | 'date'>(initialMode)
  // years mode の初期値は value から逆算
  const initialYears = () => {
    if (!value) return ''
    const months = Math.max(
      0,
      Math.round((new Date(value).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30.44))
    )
    const y = Math.round(months / 12)
    return y > 0 ? String(y) : ''
  }
  const [years, setYears] = useState(initialYears)
  const [dateStr, setDateStr] = useState(value)

  function applyYears(yStr: string) {
    setYears(yStr)
    const n = parseInt(yStr, 10)
    if (!n || n <= 0) { onChange(''); return }
    const d = new Date()
    d.setFullYear(d.getFullYear() + n)
    onChange(d.toISOString().slice(0, 10))
  }

  function applyDate(d: string) {
    setDateStr(d)
    onChange(/^\d{4}-\d{2}-\d{2}$/.test(d) ? d : '')
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        {(['years', 'date'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            style={{
              padding: '5px 14px', borderRadius: 7, fontSize: 11, fontWeight: 600,
              cursor: 'pointer', border: 'none',
              background: mode === m ? `${KAI.coral}20` : 'rgba(255,255,255,.04)',
              color: mode === m ? KAI.coral : KAI.text3,
              outline: mode === m ? `1px solid ${KAI.coral}40` : 'none',
            }}
          >
            {m === 'years' ? '年数で指定' : '日付で指定'}
          </button>
        ))}
      </div>

      {mode === 'years' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            value={years}
            onChange={(e) => applyYears(e.target.value.replace(/[^\d]/g, ''))}
            placeholder="3"
            inputMode="numeric"
            style={{
              width: 80, padding: '10px 12px', borderRadius: 9,
              background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.12)',
              color: KAI.text1, fontSize: 18, fontWeight: 700, outline: 'none', textAlign: 'center',
              fontFamily: 'var(--font-jetbrains),JetBrains Mono,monospace',
            }}
          />
          <span style={{ fontSize: 14, color: KAI.text2, fontWeight: 600 }}>年後</span>
          {years && !isNaN(parseInt(years, 10)) && (
            <span style={{ fontSize: 11, color: KAI.text3 }}>
              （{(() => {
                const d = new Date()
                d.setFullYear(d.getFullYear() + parseInt(years, 10))
                return `${d.getFullYear()}年${d.getMonth() + 1}月`
              })()}）
            </span>
          )}
        </div>
      ) : (
        <input
          type="date"
          value={dateStr}
          onChange={(e) => applyDate(e.target.value)}
          style={{
            padding: '10px 12px', borderRadius: 9,
            background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.12)',
            color: KAI.text1, fontSize: 13, outline: 'none', colorScheme: 'dark',
          }}
        />
      )}
    </div>
  )
}

/* ─── Create form ─── */
interface CreateFormProps {
  onCancel: () => void
  onCreated: () => void
}

function CreateForm({ onCancel, onCreated }: CreateFormProps) {
  const [name, setName]           = useState('')
  const [amount, setAmount]       = useState('')
  const [deadline, setDeadline]   = useState('')
  const [error, setError]         = useState('')

  const qc = useQueryClient()

  const createMut = useMutation({
    mutationFn: async (body: { name: string; target_amount: number; deadline: string }) => {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? '作成に失敗しました')
      return res.json()
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['goals'] })
      onCreated()
    },
    onError: (e: Error) => setError(e.message),
  })

  function handleSubmit() {
    setError('')
    if (!name.trim()) { setError('目標名を入力してください'); return }
    const amt = parseInt(amount.replace(/,/g, ''), 10)
    if (!amt || amt <= 0) { setError('金額を正しく入力してください'); return }
    if (!deadline) { setError('期限を入力してください'); return }
    if (new Date(deadline) <= new Date()) { setError('期限は今日より後の日付を設定してください'); return }
    createMut.mutate({ name: name.trim(), target_amount: amt, deadline })
  }

  return (
    <div style={{ ...panel, padding: '20px 18px', marginBottom: 16 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: KAI.text1, marginBottom: 16 }}>新しい目標</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* 目標名 */}
        <div>
          <label style={{ fontSize: 11, color: KAI.text3, fontWeight: 700, letterSpacing: '.06em', display: 'block', marginBottom: 5 }}>
            目標名
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="海外旅行、車の購入、緊急資金…"
            maxLength={50}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 9,
              background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.12)',
              color: KAI.text1, fontSize: 13, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* 目標金額 */}
        <div>
          <label style={{ fontSize: 11, color: KAI.text3, fontWeight: 700, letterSpacing: '.06em', display: 'block', marginBottom: 5 }}>
            目標金額（円）
          </label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d,]/g, ''))}
            placeholder="500000"
            inputMode="numeric"
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 9,
              background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.12)',
              color: KAI.text1, fontSize: 13, outline: 'none', boxSizing: 'border-box',
              fontFamily: 'var(--font-jetbrains),JetBrains Mono,monospace',
            }}
          />
          {amount && !isNaN(parseInt(amount.replace(/,/g, ''), 10)) && (
            <p style={{ fontSize: 11, color: KAI.coral, marginTop: 4, fontFamily: 'var(--font-jetbrains),JetBrains Mono,monospace' }}>
              {yen(parseInt(amount.replace(/,/g, ''), 10))}
            </p>
          )}
        </div>

        {/* 期限 */}
        <div>
          <label style={{ fontSize: 11, color: KAI.text3, fontWeight: 700, letterSpacing: '.06em', display: 'block', marginBottom: 5 }}>
            達成期限
          </label>
          <DeadlineInput value={deadline} onChange={setDeadline} initialMode="years" />
        </div>

        {error && (
          <p style={{ fontSize: 12, color: KAI.danger, margin: 0 }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button
            onClick={onCancel}
            disabled={createMut.isPending}
            style={{
              padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', border: '1px solid rgba(255,255,255,.12)',
              background: 'transparent', color: KAI.text3,
            }}
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={createMut.isPending}
            style={{
              padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700,
              cursor: createMut.isPending ? 'wait' : 'pointer',
              border: 'none', background: KAI.coral, color: '#fff',
              opacity: createMut.isPending ? 0.7 : 1,
              boxShadow: `0 0 12px rgba(251,148,119,0.3)`,
            }}
          >
            {createMut.isPending ? '作成中…' : '作成'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Goal card ─── */
interface GoalCardProps {
  goal: FinancialGoal
  onDeleted: () => void
  onUpdated: () => void
}

function GoalCard({ goal, onDeleted, onUpdated }: GoalCardProps) {
  const [editing, setEditing]   = useState(false)
  const [name, setName]         = useState(goal.name)
  const [amount, setAmount]     = useState(String(goal.target_amount))
  const [deadline, setDeadline] = useState(goal.deadline)
  const [calculating, setCalc]  = useState(false)
  const [calcError, setCalcError] = useState('')
  const qc = useQueryClient()
  const risk = goal.risk_level ? RISK_LABEL[goal.risk_level] : null

  const deleteMut = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/goals/${goal.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('削除に失敗しました')
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['goals'] })
      onDeleted()
    },
  })

  function handleDelete() {
    if (typeof window !== 'undefined' && !window.confirm(`「${goal.name}」を削除しますか？`)) return
    deleteMut.mutate()
  }

  const patchMut = useMutation({
    mutationFn: async (body: { name?: string; target_amount?: number; deadline?: string }) => {
      const res = await fetch(`/api/goals/${goal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('更新に失敗しました')
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['goals'] })
      setEditing(false)
      onUpdated()
    },
  })

  async function handleCalculate() {
    setCalc(true)
    setCalcError('')
    try {
      const res = await fetch(`/api/goals/${goal.id}/calculate`, { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(typeof body?.error === 'string' ? body.error : '試算に失敗しました')
      }
      void qc.invalidateQueries({ queryKey: ['goals'] })
    } catch (e) {
      setCalcError(e instanceof Error ? e.message : '試算に失敗しました')
    } finally {
      setCalc(false)
    }
  }

  function handleSave() {
    const amt = parseInt(amount.replace(/,/g, ''), 10)
    if (!name.trim() || !amt || amt <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return
    patchMut.mutate({ name: name.trim(), target_amount: amt, deadline })
  }

  return (
    <div style={{ ...panel, padding: '16px 18px' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: editing ? 12 : 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              style={{
                width: '100%', padding: '6px 10px', borderRadius: 7,
                background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.15)',
                color: KAI.text1, fontSize: 13, fontWeight: 700, outline: 'none',
              }}
            />
          ) : (
            <p style={{ fontSize: 14, fontWeight: 700, color: KAI.text1, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Target size={14} strokeWidth={2} style={{ flexShrink: 0 }}/> {goal.name}
              {risk && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 7px',
                  borderRadius: 99, background: `${risk.color}18`,
                  border: `1px solid ${risk.color}40`, color: risk.color,
                }}>
                  {risk.label}
                </span>
              )}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
          {editing ? (
            <>
              <button onClick={handleSave} disabled={patchMut.isPending} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: KAI.success, padding: 2 }}>
                <CheckIcon size={16} />
              </button>
              <button onClick={() => { setEditing(false); setName(goal.name); setAmount(String(goal.target_amount)); setDeadline(goal.deadline) }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: KAI.text3, padding: 2 }}>
                <XIcon size={16} />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: KAI.text3, padding: 2 }}>
                <PencilIcon size={14} />
              </button>
              <button onClick={handleDelete} disabled={deleteMut.isPending} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: KAI.danger, padding: 2 }}>
                <Trash2Icon size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ fontSize: 10, color: KAI.text4, display: 'block', marginBottom: 3 }}>金額（円）</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
              style={{
                width: '100%', padding: '6px 10px', borderRadius: 7,
                background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.15)',
                color: KAI.text1, fontSize: 13, outline: 'none', boxSizing: 'border-box',
                fontFamily: 'var(--font-jetbrains),JetBrains Mono,monospace',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 10, color: KAI.text4, display: 'block', marginBottom: 3 }}>期限</label>
            <DeadlineInput value={deadline} onChange={setDeadline} initialMode="date" />
          </div>
        </div>
      ) : (
        <>
          {/* info row */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
            <div>
              <p style={{ fontSize: 10, color: KAI.text4, margin: '0 0 2px' }}>目標金額</p>
              <p style={{ fontFamily: 'var(--font-jetbrains),JetBrains Mono,monospace', fontSize: 15, fontWeight: 700, color: KAI.text1, margin: 0 }}>
                {yen(goal.target_amount)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 10, color: KAI.text4, margin: '0 0 2px' }}>期限</p>
              <p style={{ fontSize: 13, color: KAI.text2, margin: 0 }}>
                {goal.deadline} <span style={{ color: KAI.text4, fontSize: 11 }}>({deadlineLabel(goal.deadline)})</span>
              </p>
            </div>
            {goal.monthly_savings_target && (
              <div>
                <p style={{ fontSize: 10, color: KAI.text4, margin: '0 0 2px' }}>月次貯蓄目標</p>
                <p style={{ fontFamily: 'var(--font-jetbrains),JetBrains Mono,monospace', fontSize: 13, fontWeight: 600, color: KAI.coral, margin: 0 }}>
                  {yen(goal.monthly_savings_target)}
                </p>
              </div>
            )}
          </div>

          {/* danger alternative */}
          {goal.risk_level === 'danger' && goal.suggested_months_alternative && (
            <div style={{
              marginBottom: 10, padding: '8px 12px', borderRadius: 10,
              background: 'rgba(251,113,133,.08)', border: '1px solid rgba(251,113,133,.20)',
            }}>
              <p style={{ fontSize: 11, color: KAI.danger, fontWeight: 600, margin: '0 0 2px' }}>
                ⚠ 現状のペースでは達成困難
              </p>
              <p style={{ fontSize: 11, color: KAI.text3, margin: 0 }}>
                AI提案: <strong style={{ color: KAI.text2 }}>約 {goal.suggested_months_alternative} ヶ月後</strong>
                （{Math.round(goal.suggested_months_alternative / 12 * 10) / 10} 年）が現実的な期限です
              </p>
            </div>
          )}

          {/* plan steps */}
          {goal.plan_steps && goal.plan_steps.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 10, color: KAI.text4, fontWeight: 700, letterSpacing: '.08em', margin: '0 0 6px' }}>AI プラン</p>
              {goal.plan_steps.map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 4 }}>
                  <span style={{
                    flexShrink: 0, width: 16, height: 16, borderRadius: 4,
                    background: `${KAI.coral}20`, border: `1px solid ${KAI.coral}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 8, fontWeight: 700, color: KAI.coral,
                    fontFamily: 'var(--font-jetbrains),JetBrains Mono,monospace',
                  }}>
                    {i + 1}
                  </span>
                  <span style={{ fontSize: 11, color: KAI.text3, lineHeight: 1.6 }}>{step}</span>
                </div>
              ))}
            </div>
          )}

          {/* advice */}
          {goal.advice && (
            <p style={{ fontSize: 11, color: KAI.text3, lineHeight: 1.7, margin: '0 0 10px' }}>
              {goal.advice}
            </p>
          )}

          {/* AI calculate button */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button
              onClick={handleCalculate}
              disabled={calculating}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
                padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                cursor: calculating ? 'wait' : 'pointer',
                background: `${KAI.violet}18`, border: `1px solid ${KAI.violet}40`,
                color: KAI.violet, opacity: calculating ? 0.7 : 1,
              }}
            >
              <SparklesIcon size={13} />
              {calculating ? 'AI試算中…' : goal.monthly_savings_target ? 'AI試算を再実行' : 'AI試算を実行'}
            </button>
            {calcError && (
              <p style={{ fontSize: 11, color: KAI.danger, margin: 0 }}>{calcError}</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/* ─── page ─── */
export default function GoalsPage() {
  const [showCreate, setShowCreate] = useState(false)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<{ goals: FinancialGoal[] }>({
    queryKey: ['goals'],
    queryFn: () => fetch('/api/goals').then((r) => r.json()),
  })

  const goals = data?.goals ?? []

  return (
    <div className="min-h-screen" style={{ background: '#0c0a14' }}>
      <div aria-hidden className="pointer-events-none fixed inset-0" style={{ zIndex: 0, backgroundImage: `radial-gradient(ellipse 600px 400px at 80% 20%, rgba(251,148,119,.09), transparent 55%),radial-gradient(ellipse 500px 300px at 20% 80%, rgba(122,167,255,.06), transparent 55%)` }} />

      <div className="relative min-h-screen" style={{ zIndex: 2 }}>
        {/* header */}
        <header
          className="sticky top-0 z-30 flex items-center gap-3 px-4 py-[14px]"
          style={{ background: 'rgba(8,8,14,.55)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.10)' }}
        >
          <Link href="/settings" style={{ color: KAI.text3, display: 'flex', alignItems: 'center' }}>
            <ChevronLeftIcon size={20} />
          </Link>
          <h1 style={{ fontSize: 17, fontWeight: 700, color: KAI.text1, flex: 1 }}>目標管理</h1>
          {!showCreate && (
            <button
              onClick={() => setShowCreate(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                background: `${KAI.coral}20`, border: `1px solid ${KAI.coral}40`,
                color: KAI.coral, cursor: 'pointer',
              }}
            >
              <PlusIcon size={13} /> 追加
            </button>
          )}
        </header>

        <main className="mx-auto max-w-2xl px-4 py-5 pb-32 space-y-4">
          {showCreate && (
            <CreateForm
              onCancel={() => setShowCreate(false)}
              onCreated={() => setShowCreate(false)}
            />
          )}

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: KAI.text3, fontSize: 13 }}>読み込み中…</div>
          ) : goals.length === 0 && !showCreate ? (
            <div style={{ ...panel, padding: '40px 20px', textAlign: 'center' }}>
              <Target size={40} strokeWidth={1.5} style={{ color: KAI.text3, marginBottom: 12 }}/>
              <p style={{ fontSize: 14, fontWeight: 600, color: KAI.text2, marginBottom: 6 }}>目標がまだありません</p>
              <p style={{ fontSize: 12, color: KAI.text4, marginBottom: 20, lineHeight: 1.7 }}>
                目標を設定すると、AIが月次の<br />使用可能額と達成プランを算出します
              </p>
              <button
                onClick={() => setShowCreate(true)}
                style={{
                  padding: '10px 24px', borderRadius: 9, fontSize: 13, fontWeight: 700,
                  background: KAI.coral, color: '#fff', border: 'none', cursor: 'pointer',
                  boxShadow: `0 0 16px rgba(251,148,119,0.35)`,
                }}
              >
                最初の目標を設定する
              </button>
            </div>
          ) : (
            goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onDeleted={() => void qc.invalidateQueries({ queryKey: ['goals'] })}
                onUpdated={() => void qc.invalidateQueries({ queryKey: ['goals'] })}
              />
            ))
          )}

          <p style={{ fontSize: 11, color: KAI.text5, textAlign: 'center', paddingTop: 8, lineHeight: 1.7 }}>
            目標の試算にはSonnetを使用します。<br />試算は手動でのみ実行されます。
          </p>
        </main>
      </div>
    </div>
  )
}
