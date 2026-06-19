'use client'

import { Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Line, ComposedChart } from 'recharts'
import { KAI } from '@/lib/kai-tokens'

const MONO = 'var(--font-mono), "JetBrains Mono", monospace'

interface GrowthPoint {
  week: string
  total: number
  exactCache: number
  exactCacheRate: number
}

export function CacheGrowthChart({ data, height = 90 }: { data: GrowthPoint[]; height?: number }) {
  const chartData = data.map(d => ({
    week: d.week.slice(5),
    cacheRate: Math.round(d.exactCacheRate * 100),
    llmRate: d.total > 0 ? Math.round(((d.total - d.exactCache) / d.total) * 100) : 0,
  }))

  if (!chartData.length) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: KAI.text4, fontSize: 11 }}>データなし</div>
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={chartData} margin={{ left: -10, right: 4, top: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="cacheGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={KAI.mint} stopOpacity={0.34} />
            <stop offset="100%" stopColor={KAI.mint} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="week"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 9, fill: KAI.text4, fontFamily: MONO }}
        />
        <YAxis
          domain={[0, 100]}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 9, fill: KAI.text4, fontFamily: MONO }}
          tickFormatter={v => `${v}%`}
          width={32}
        />
        <Tooltip
          contentStyle={{
            background: KAI.overlayBg,
            border: `1px solid ${KAI.borderStrong}`,
            borderRadius: 10,
            padding: '8px 12px',
            fontSize: 11,
            fontFamily: MONO,
          }}
          labelStyle={{ color: KAI.text3, fontSize: 10 }}
          formatter={(value, name) => [
            `${value}%`,
            name === 'cacheRate' ? 'キャッシュ率' : 'LLM呼び出し',
          ]}
        />
        <Area
          type="monotone"
          dataKey="cacheRate"
          stroke={KAI.mint}
          strokeWidth={2}
          fill="url(#cacheGrad)"
          dot={false}
          activeDot={{ r: 3.5, fill: KAI.mint }}
        />
        {height >= 120 && (
          <Line
            type="monotone"
            dataKey="llmRate"
            stroke={KAI.violet}
            strokeWidth={1.8}
            strokeDasharray="4 4"
            dot={false}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  )
}
