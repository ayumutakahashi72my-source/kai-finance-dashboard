'use client'

import {
  AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { UP, DOWN, TEXT3, MONO_FONT, panel, TooltipDark } from './dashboard-utils'

export function DesktopTrendChart({ monthlyData }: {
  monthlyData: { m: string; inc: number; exp: number }[]
}) {
  return (
    <div style={{ ...panel, borderRadius: 18, padding: '18px 18px 10px', animation: 'kai-rise .5s .04s ease-out both' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>収支トレンド</div>
          <div style={{ fontSize: 10, color: TEXT3, marginTop: 2 }}>過去 6 ヶ月 / 月次集計</div>
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: 10, color: TEXT3 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><i style={{ display: 'inline-block', width: 10, height: 2, background: UP, borderRadius: 1 }}/> 収入</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><i style={{ display: 'inline-block', width: 10, height: 2, background: DOWN, borderRadius: 1 }}/> 支出</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={monthlyData} margin={{ left: -10, right: 4 }}>
          <defs>
            <linearGradient id="dI" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={UP} stopOpacity={0.3}/><stop offset="100%" stopColor={UP} stopOpacity={0}/></linearGradient>
            <linearGradient id="dE" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={DOWN} stopOpacity={0.3}/><stop offset="100%" stopColor={DOWN} stopOpacity={0}/></linearGradient>
          </defs>
          <XAxis dataKey="m" tick={{ fontSize: 10, fill: TEXT3, fontFamily: MONO_FONT }} axisLine={false} tickLine={false}/>
          <YAxis tick={{ fontSize: 9, fill: TEXT3 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}万`} width={28}/>
          <Tooltip content={<TooltipDark/>}/>
          <Area type="monotone" dataKey="inc" name="収入" stroke={UP}   strokeWidth={2} fill="url(#dI)" dot={false}/>
          <Area type="monotone" dataKey="exp" name="支出" stroke={DOWN} strokeWidth={2} fill="url(#dE)" dot={false}/>
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
