'use client'

import { Target } from 'lucide-react'
import Link from 'next/link'
import { KAI } from '@/lib/kai-tokens'

function BlurredPlaceholder() {
  const items = [KAI.coral, KAI.blue, KAI.violet, KAI.mint]
  return (
    <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {items.map((color, i) => (
        <div
          key={i}
          style={{
            background: 'rgba(255,255,255,.03)',
            border: '1px solid rgba(255,255,255,.06)',
            borderRadius: 14,
            padding: '10px 12px',
            minHeight: 80,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <div style={{ width: 22, height: 22, borderRadius: 7, background: `${color}22`, border: `1px solid ${color}44` }} />
            <div style={{ height: 10, width: 60, borderRadius: 4, background: 'rgba(255,255,255,.08)' }} />
          </div>
          <div style={{ height: 14, width: 80, borderRadius: 4, background: 'rgba(255,255,255,.08)', marginBottom: 8 }} />
          <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${40 + i * 12}%`, background: color, borderRadius: 99 }} />
          </div>
        </div>
      ))}
    </section>
  )
}

export function GoalBanner() {
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ filter: 'blur(5px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.5 }}>
        <BlurredPlaceholder />
      </div>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(10,10,16,0.60)',
          borderRadius: 14,
          gap: 8,
        }}
      >
        <Target size={28} strokeWidth={1.5} style={{ color: KAI.text3 }}/>
        <p style={{ color: KAI.text2, fontSize: 13, fontWeight: 600, textAlign: 'center', margin: 0 }}>
          目標を決めましょう
        </p>
        <p style={{ color: KAI.text4, fontSize: 11, textAlign: 'center', maxWidth: 180, margin: 0, lineHeight: 1.6 }}>
          目標を設定すると月次の<br />使用可能額がわかります
        </p>
        <Link href="/settings/goals">
          <button
            style={{
              background: KAI.coral,
              color: '#fff',
              borderRadius: 9,
              padding: '8px 22px',
              fontSize: 13,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              marginTop: 4,
              boxShadow: `0 0 16px rgba(251,148,119,0.35)`,
            }}
          >
            目標を設定する
          </button>
        </Link>
      </div>
    </div>
  )
}
