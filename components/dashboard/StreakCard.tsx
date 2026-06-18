'use client'

import { CORAL, TEXT2, TEXT3 } from './dashboard-utils'

export function StreakCard({ streak }: { streak: number }) {
  const bars = Array.from({ length: 8 }, (_, i) => i < streak)
  return (
    <div
      className="kai-rise rounded-[18px] p-4"
      style={{ background: 'linear-gradient(135deg,rgba(251,148,119,0.10),rgba(20,22,32,0.66))', backdropFilter: 'blur(24px) saturate(160%)', border: '1px solid rgba(251,148,119,0.22)', animationDelay: '200ms', borderRadius: 18 }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p style={{ fontSize: 12, color: TEXT3, letterSpacing: '.08em', fontWeight: 700 }}>連続記録</p>
          <p style={{ fontFamily: 'var(--font-mono),monospace', marginTop: 4, fontSize: 28, fontWeight: 700, color: CORAL, textShadow: '0 0 20px rgba(251,148,119,.32)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="22" height="24" viewBox="0 0 12 14" fill="none"><path d="M6 1C6 1 9.5 4.5 9.5 7.5C9.5 9.5 8 11 6 11C4 11 2.5 9.5 2.5 7.5C2.5 5.5 4 3.5 4 3.5C4 3.5 4.5 5 5.5 5C5.5 5 5.5 3 6 1Z" stroke={CORAL} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" fill={`${CORAL}22`}/></svg>
            {streak}<span style={{ fontSize: 14, color: TEXT2, marginLeft: 2 }}>日</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {bars.map((on, i) => (
            <div key={i} style={{ width: 16, height: 26, borderRadius: 4, background: on ? CORAL : 'rgba(255,255,255,.05)', boxShadow: on ? `0 0 8px ${CORAL}66` : 'none', border: on ? 'none' : '1px dashed rgba(255,255,255,.10)' }} />
          ))}
        </div>
      </div>
      <p style={{ fontSize: 13, color: TEXT3, marginTop: 8 }}>
        {streak > 0 ? `${streak}日連続で家計記録中` : '今日の記録をつけよう'}
      </p>
    </div>
  )
}
