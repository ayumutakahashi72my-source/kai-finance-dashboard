'use client'

import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/Skeleton'

interface ScoreData {
  score: number
  budget_score: number
  saving_score: number
  bonus_score: number
  score_grade: 'S' | 'A' | 'B' | 'C' | 'D'
  month: string
  is_finalized: boolean
}

const GRADE_COLOR: Record<string, string> = {
  S: '#fb9477',
  A: '#4ade80',
  B: '#fbbf24',
  C: '#fb923c',
  D: '#fb7185',
}

function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const r = 28
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - score / 100)
  const color = GRADE_COLOR[grade] ?? '#fb9477'

  return (
    <svg width={68} height={68} viewBox="0 0 68 68" aria-label={`スコア ${score}点 グレード ${grade}`}>
      <circle cx={34} cy={34} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
      <circle
        cx={34} cy={34} r={r}
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 34 34)"
        style={{ transition: 'stroke-dashoffset 0.8s ease', filter: `drop-shadow(0 0 5px ${color})` }}
      />
      <text x={34} y={31} textAnchor="middle" fill={color} fontSize={16} fontWeight={800} fontFamily="monospace">
        {grade}
      </text>
      <text x={34} y={45} textAnchor="middle" fill="#8b8ba0" fontSize={10} fontFamily="monospace">
        {score}pt
      </text>
    </svg>
  )
}

interface Props {
  month: string
  /** 'mini' = compact score number only for KPI row */
  variant?: 'default' | 'mini' | 'big'
}

export function ScoreCard({ month, variant = 'default' }: Props) {
  const { data, isLoading } = useQuery<{ data: ScoreData | null }>({
    queryKey: ['monthly_score', month],
    queryFn: () => fetch(`/api/scores?month=${month}`).then((r) => r.json()),
  })

  if (isLoading) {
    if (variant === 'mini') {
      return (
        <div className="flex items-baseline gap-2">
          <Skeleton variant="line-lg" className="w-16 h-7" />
        </div>
      )
    }
    return (
      <div
        className="reveal-up rounded-[18px] p-4"
        style={{ background: 'rgba(20,22,32,0.7)', border: '1px solid rgba(255,255,255,0.08)', animationDelay: '100ms' }}
      >
        <div className="flex items-center gap-4">
          <Skeleton variant="block" className="h-[68px] w-[68px] flex-shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="line-sm" className="w-20" />
            <Skeleton variant="line-md" className="w-48" />
          </div>
        </div>
      </div>
    )
  }

  const score = data?.data

  if (!score) {
    if (variant === 'mini') {
      return (
        <p className="mono" style={{ fontSize: 24, fontWeight: 700, color: '#8b8ba0' }}>—</p>
      )
    }
    return (
      <div
        className="reveal-up rounded-[18px] px-5 py-4 text-center text-sm text-[#5e5e72]"
        style={{ background: 'rgba(20,22,32,0.5)', border: '1px solid rgba(255,255,255,0.06)', animationDelay: '100ms' }}
      >
        今月のスコアはまだ計算されていません
      </div>
    )
  }

  /* mini variant — just the score number + trend bars */
  if (variant === 'mini') {
    const color = GRADE_COLOR[score.score_grade] ?? '#fb9477'
    return (
      <>
        <p className="mono" style={{ fontSize: 24, fontWeight: 700, color }}>{score.score}</p>
        <span className="mono text-xs" style={{ color: '#8b8ba0' }}>{score.score_grade}</span>
        <div className="ml-auto flex gap-0.5">
          {[score.budget_score, score.saving_score, score.bonus_score].map((v, i) => (
            <div key={i} style={{ width: 6, height: 6 + Math.round((v / 60) * 16), borderRadius: 1, background: color, opacity: 0.5 + (i === 0 ? 0.5 : 0) }} />
          ))}
        </div>
      </>
    )
  }

  /* big variant — large arc ring (132x96) with sub-scores grid */
  if (variant === 'big') {
    const color = GRADE_COLOR[score.score_grade] ?? '#fb9477'
    const r = 52, cx = 66, cy = 66, circ = 2 * Math.PI * r
    const arc = (score.score / 100) * circ * 0.75
    const off = circ * 0.125
    return (
      <div className="flex flex-col items-center">
        <svg width={132} height={96} viewBox="0 0 132 96" style={{ filter: `drop-shadow(0 0 18px ${color}44)` }}>
          <defs>
            <linearGradient id="rgBig" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity={0.45} />
              <stop offset="100%" stopColor={color} />
            </linearGradient>
          </defs>
          <path
            d={`M${cx - r * Math.cos(Math.PI * 0.75)} ${cy + r * Math.sin(Math.PI * 0.75)} A${r} ${r} 0 1 1 ${cx + r * Math.cos(Math.PI * 0.75)} ${cy + r * Math.sin(Math.PI * 0.75)}`}
            fill="none" stroke="rgba(255,255,255,.04)" strokeWidth="9" strokeLinecap="round"
          />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="url(#rgBig)" strokeWidth="9" strokeLinecap="round"
            strokeDasharray={`${arc} ${circ}`} strokeDashoffset={off}
            style={{ transition: 'stroke-dasharray .7s cubic-bezier(.16,1,.3,1)' }}
          />
          <text x={cx} y={cy - 4} textAnchor="middle" fontSize="28" fontWeight="700" fill={color} fontFamily="var(--font-mono),monospace">{score.score}</text>
          <text x={cx} y={cy + 13} textAnchor="middle" fontSize="9" fill="#8b8ba0" letterSpacing=".2em">/ 100</text>
          <text x={cx} y={cy + 28} textAnchor="middle" fontSize="13" fontWeight="700" fill={color} fontFamily="var(--font-mono),monospace">{score.score_grade}</text>
        </svg>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#fb9477', background: 'rgba(251,148,119,.10)', border: '1px solid rgba(251,148,119,.25)', padding: '4px 12px', borderRadius: 99, letterSpacing: '.04em', marginTop: 8 }}>
          {score.is_finalized ? '確定済み' : '集計中'}
        </span>
        <div className="mt-3.5 grid w-full grid-cols-3 gap-1.5">
          {[['予算達成', score.budget_score, '#fb9477'], ['節約行動', score.saving_score, '#4ade80'], ['ボーナス', score.bonus_score, '#fbbf24']] .map(([label, value, c]) => (
            <div key={label as string} style={{ textAlign: 'center', padding: '10px 4px', background: 'rgba(255,255,255,.02)', borderRadius: 9, border: '1px solid rgba(255,255,255,0.10)' }}>
              <p className="mono" style={{ fontSize: 18, fontWeight: 700, color: c as string }}>{value}</p>
              <p style={{ fontSize: 11, color: '#8b8ba0', marginTop: 3, fontWeight: 600 }}>{label}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  /* default variant */
  return (
    <div
      className="reveal-up rounded-[18px] px-5 py-4"
      style={{
        background: 'linear-gradient(135deg,rgba(251,148,119,0.07),rgba(20,22,32,0.7))',
        backdropFilter: 'blur(24px) saturate(160%)',
        border: '1px solid rgba(251,148,119,0.15)',
        animationDelay: '100ms',
      }}
    >
      <div className="flex items-center gap-4">
        <ScoreRing score={score.score} grade={score.score_grade} />
        <div className="flex-1">
          <p className="lbl mb-1.5">今月のスコア</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[#8b8ba0]">
            <span>予算達成 <span className="mono text-[#c4c4d0]">{score.budget_score}pt</span></span>
            <span>節約行動 <span className="mono text-[#c4c4d0]">{score.saving_score}pt</span></span>
            <span>ボーナス <span className="mono text-[#c4c4d0]">{score.bonus_score}pt</span></span>
          </div>
          {score.is_finalized && (
            <p className="mt-1 text-[11px] text-[#5e5e72]">確定済み</p>
          )}
        </div>
      </div>
    </div>
  )
}
