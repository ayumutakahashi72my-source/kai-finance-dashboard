'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { SearchIcon, XIcon, SlidersHorizontalIcon } from 'lucide-react'
import { KAI } from '@/lib/kai-tokens'
import type { Category } from '@/lib/types'

export interface TransactionFilterValues {
  q: string
  cat: string         // comma-separated category ids
  from: string
  to: string
  min: string
  max: string
}

export function readFiltersFromUrl(params: URLSearchParams): TransactionFilterValues {
  return {
    q:    params.get('q')    ?? '',
    cat:  params.get('cat')  ?? '',
    from: params.get('from') ?? '',
    to:   params.get('to')   ?? '',
    min:  params.get('min')  ?? '',
    max:  params.get('max')  ?? '',
  }
}

export function isFilterActive(f: TransactionFilterValues): boolean {
  return !!(f.q || f.cat || f.from || f.to || f.min || f.max)
}

interface Props {
  categories: Category[]
}

export function TransactionFilters({ categories }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const search = useSearchParams()
  const initial = readFiltersFromUrl(search)

  const [filters, setFilters] = useState<Omit<TransactionFilterValues, never>>({
    q: initial.q, cat: initial.cat, from: initial.from,
    to: initial.to, min: initial.min, max: initial.max,
  })
  const { q, cat, from, to, min, max } = filters
  const [showAdv, setShowAdv] = useState(false)

  // URL 変化時に一括更新（1回の setState で済む）
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFilters(readFiltersFromUrl(search))
  }, [search])

  function applyToUrl(next: Partial<TransactionFilterValues>) {
    const sp = new URLSearchParams(search.toString())
    const merged: TransactionFilterValues = { q, cat, from, to, min, max, ...next }
    for (const k of ['q', 'cat', 'from', 'to', 'min', 'max'] as const) {
      if (merged[k]) sp.set(k, merged[k])
      else sp.delete(k)
    }
    router.push(`${pathname}?${sp.toString()}`)
  }

  function reset() {
    setFilters({ q: '', cat: '', from: '', to: '', min: '', max: '' })
    const sp = new URLSearchParams(search.toString())
    for (const k of ['q', 'cat', 'from', 'to', 'min', 'max']) sp.delete(k)
    router.push(`${pathname}?${sp.toString()}`)
  }

  const active = isFilterActive(initial)
  const catIds = cat ? cat.split(',') : []

  // 親カテゴリとその子IDをまとめたマップ
  const parentGroups = new Map<string, string[]>()
  for (const c of categories) {
    if (!c.parent_id) parentGroups.set(c.id, [c.id])
  }
  for (const c of categories) {
    if (c.parent_id && parentGroups.has(c.parent_id)) {
      parentGroups.get(c.parent_id)!.push(c.id)
    }
  }
  const parents = categories.filter((c) => !c.parent_id)

  function isParentSelected(parentId: string) {
    return (parentGroups.get(parentId) ?? []).some((id) => catIds.includes(id))
  }

  function toggleParent(parentId: string) {
    const group = parentGroups.get(parentId) ?? [parentId]
    const selected = group.some((id) => catIds.includes(id))
    const next = selected
      ? catIds.filter((id) => !group.includes(id)).join(',')
      : [...catIds, ...group.filter((id) => !catIds.includes(id))].join(',')
    setFilters((f) => ({ ...f, cat: next }))
    applyToUrl({ cat: next })
  }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* search bar */}
      <div style={{ display: 'flex', gap: 6 }}>
        <div
          style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)',
            borderRadius: 10, padding: '8px 12px',
          }}
        >
          <SearchIcon size={14} color={KAI.text4} />
          <input
            value={q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            onKeyDown={(e) => { if (e.key === 'Enter') applyToUrl({ q }) }}
            onBlur={() => { if (q !== initial.q) applyToUrl({ q }) }}
            placeholder="店舗名で検索…"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: KAI.text1, fontSize: 13,
            }}
          />
          {q && (
            <button
              type="button"
              onClick={() => { setFilters((f) => ({ ...f, q: '' })); applyToUrl({ q: '' }) }}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: KAI.text4, display: 'flex' }}
            >
              <XIcon size={14} />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowAdv((v) => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: showAdv || active ? `${KAI.coral}18` : 'rgba(255,255,255,.04)',
            border: `1px solid ${showAdv || active ? `${KAI.coral}40` : 'rgba(255,255,255,.08)'}`,
            borderRadius: 10, padding: '8px 12px', cursor: 'pointer',
            color: showAdv || active ? KAI.coral : KAI.text3,
            fontSize: 12, fontWeight: 600,
          }}
        >
          <SlidersHorizontalIcon size={13} />
          詳細
        </button>
      </div>

      {/* advanced */}
      {showAdv && (
        <div
          style={{
            background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)',
            borderRadius: 12, padding: '12px 14px',
            display: 'flex', flexDirection: 'column', gap: 12,
          }}
        >
          {/* category chips */}
          <div>
            <p style={{ fontSize: 10, color: KAI.text4, fontWeight: 700, letterSpacing: '.06em', margin: '0 0 8px' }}>カテゴリ</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {parents.map((c) => {
                const selected = isParentSelected(c.id)
                const color = c.color ?? KAI.text3
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleParent(c.id)}
                    style={{
                      fontSize: 13,
                      padding: '6px 14px',
                      borderRadius: 99,
                      background: selected ? `${color}28` : 'rgba(255,255,255,.05)',
                      border: `1px solid ${selected ? `${color}70` : 'rgba(255,255,255,.10)'}`,
                      color: selected ? color : KAI.text2,
                      cursor: 'pointer',
                      fontWeight: selected ? 700 : 500,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {c.name}
                  </button>
                )
              })}
            </div>
          </div>

          {/* date range */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <p style={{ fontSize: 10, color: KAI.text4, fontWeight: 700, letterSpacing: '.06em', margin: '0 0 4px' }}>開始日</p>
              <input
                type="date"
                value={from}
                onChange={(e) => { setFilters((f) => ({ ...f, from: e.target.value })); applyToUrl({ from: e.target.value }) }}
                style={{
                  width: '100%', padding: '6px 10px', borderRadius: 7,
                  background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.10)',
                  color: KAI.text1, fontSize: 12, outline: 'none', colorScheme: 'dark', boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <p style={{ fontSize: 10, color: KAI.text4, fontWeight: 700, letterSpacing: '.06em', margin: '0 0 4px' }}>終了日</p>
              <input
                type="date"
                value={to}
                onChange={(e) => { setFilters((f) => ({ ...f, to: e.target.value })); applyToUrl({ to: e.target.value }) }}
                style={{
                  width: '100%', padding: '6px 10px', borderRadius: 7,
                  background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.10)',
                  color: KAI.text1, fontSize: 12, outline: 'none', colorScheme: 'dark', boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* amount range */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <p style={{ fontSize: 10, color: KAI.text4, fontWeight: 700, letterSpacing: '.06em', margin: '0 0 4px' }}>最低金額（円）</p>
              <input
                value={min}
                inputMode="numeric"
                onChange={(e) => setFilters((f) => ({ ...f, min: e.target.value.replace(/[^\d]/g, '') }))}
                onBlur={() => applyToUrl({ min })}
                placeholder="500"
                style={{
                  width: '100%', padding: '6px 10px', borderRadius: 7,
                  background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.10)',
                  color: KAI.text1, fontSize: 12, outline: 'none', boxSizing: 'border-box',
                  fontFamily: 'var(--font-jetbrains),JetBrains Mono,monospace',
                }}
              />
            </div>
            <div>
              <p style={{ fontSize: 10, color: KAI.text4, fontWeight: 700, letterSpacing: '.06em', margin: '0 0 4px' }}>最高金額（円）</p>
              <input
                value={max}
                inputMode="numeric"
                onChange={(e) => setFilters((f) => ({ ...f, max: e.target.value.replace(/[^\d]/g, '') }))}
                onBlur={() => applyToUrl({ max })}
                placeholder="50000"
                style={{
                  width: '100%', padding: '6px 10px', borderRadius: 7,
                  background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.10)',
                  color: KAI.text1, fontSize: 12, outline: 'none', boxSizing: 'border-box',
                  fontFamily: 'var(--font-jetbrains),JetBrains Mono,monospace',
                }}
              />
            </div>
          </div>

          {active && (
            <button
              type="button"
              onClick={reset}
              style={{
                alignSelf: 'flex-start', background: 'transparent', border: 'none',
                color: KAI.text3, fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: '2px 0',
              }}
            >
              ✕ フィルタをクリア
            </button>
          )}
        </div>
      )}
    </section>
  )
}
