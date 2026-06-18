'use client'

import { useQuery } from '@tanstack/react-query'

interface AnomalyFlag {
  category_name: string
  actual_amount: number
  expected_amount: number
  deviation_rate: number
  anomaly_type: 'spike' | 'drop'
}

function AnomalyItem({ flag }: { flag: AnomalyFlag }) {
  const isSpike = flag.anomaly_type === 'spike'
  const pct = Math.round(Math.abs(flag.deviation_rate) * 100)
  const color   = isSpike ? '#fb7185' : '#60a5fa'
  const bgColor = isSpike ? 'rgba(251,113,133,0.08)' : 'rgba(96,165,250,0.08)'
  const border  = isSpike ? 'rgba(251,113,133,0.22)' : 'rgba(96,165,250,0.22)'
  const arrow   = isSpike ? '↑' : '↓'

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: bgColor, border: `1px solid ${border}`,
        borderRadius: 10, padding: '8px 12px',
      }}
    >
      <span style={{ fontSize: 14, color, flexShrink: 0 }}>{arrow}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#e8e8f0' }}>
          {flag.category_name}
        </span>
        <span style={{ fontSize: 11, color: '#8888a0', marginLeft: 6 }}>
          先月比 {isSpike ? '+' : '−'}{pct}%
        </span>
      </div>
      <div style={{ fontFamily: 'var(--font-mono),monospace', fontSize: 11, color, flexShrink: 0 }}>
        ¥{flag.actual_amount.toLocaleString('ja-JP')}
      </div>
    </div>
  )
}

export function AnomalyBanner({ month }: { month: string }) {
  const { data, isLoading } = useQuery<{ anomalies: AnomalyFlag[] }>({
    queryKey: ['anomalies', month],
    queryFn: async () => {
      const r = await fetch(`/api/anomalies?month=${month}`)
      if (!r.ok) throw new Error('異常検知の読み込みに失敗しました')
      return r.json()
    },
    staleTime: 1000 * 60 * 10,
    retry: 1,
  })

  const anomalies = data?.anomalies ?? []
  if (isLoading || anomalies.length === 0) return null

  const byDesc = (a: AnomalyFlag, b: AnomalyFlag) =>
    Math.abs(b.deviation_rate) - Math.abs(a.deviation_rate)
  const spikes = anomalies.filter((a) => a.anomaly_type === 'spike').sort(byDesc).slice(0, 3)
  const drops  = anomalies.filter((a) => a.anomaly_type === 'drop').sort(byDesc).slice(0, 2)
  const items  = [...spikes, ...drops]

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 16,
        padding: '12px 14px',
        animation: 'kai-rise .5s ease-out both',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 12 }}>⚡</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#fb9477', letterSpacing: '.06em' }}>
          支出異常アラート
        </span>
        <span style={{ fontSize: 10, color: '#5e5e72', marginLeft: 'auto' }}>
          前3ヶ月平均比 ±30%以上
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((flag) => (
          <AnomalyItem key={flag.category_name} flag={flag} />
        ))}
      </div>
    </div>
  )
}
