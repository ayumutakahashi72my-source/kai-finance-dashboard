interface Suggestion {
  category_name: string
  suggested_amount: number
  reason: string
}

interface Props {
  suggestions: Suggestion[]
  actualByCategory: Record<string, number>
}

function bar(actual: number, suggested: number) {
  if (suggested === 0) return { pct: 100, color: '#5e5e72' }
  const pct = Math.min((actual / suggested) * 100, 100)
  const over = actual > suggested
  const close = !over && pct >= 80
  const color = over ? '#fb7185' : close ? '#fbbf24' : '#fb9477'
  return { pct, color, over }
}

export function BudgetSuggestCard({ suggestions, actualByCategory }: Props) {
  return (
    <div
      className="rounded-[18px] p-4"
      style={{
        background: 'linear-gradient(135deg,rgba(251,148,119,0.06),rgba(20,22,32,0.66))',
        backdropFilter: 'blur(24px) saturate(160%)',
        border: '1px solid rgba(251,148,119,0.14)',
      }}
    >
      <div className="mb-3 flex items-center gap-2">
        <span
          className="mono flex h-6 w-6 items-center justify-center rounded-[7px] text-[11px] font-black text-[#0a0a10]"
          style={{ background: 'linear-gradient(135deg,#fb9477,#22d3ee)' }}
        >
          ¥
        </span>
        <span className="text-[13px] font-bold text-[#fb9477]">カテゴリ別予算</span>
      </div>

      <div className="space-y-3">
        {suggestions.map((s) => {
          const actual = actualByCategory[s.category_name] ?? 0
          const { pct, color, over } = bar(actual, s.suggested_amount)
          return (
            <div key={s.category_name}>
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="text-[13px] font-medium text-[#f0f0f5]">{s.category_name}</span>
                <span className="mono whitespace-nowrap text-[12px]" style={{ color }}>
                  ¥{actual.toLocaleString()}
                  <span className="text-[#5e5e72]"> / ¥{s.suggested_amount.toLocaleString()}</span>
                </span>
              </div>

              {/* progress bar */}
              <div className="h-[5px] w-full overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: color, boxShadow: `0 0 8px ${color}55` }}
                />
              </div>

              {over && (
                <p className="mt-0.5 text-[11px] text-[#fb7185]">
                  ¥{(actual - s.suggested_amount).toLocaleString()} オーバー
                </p>
              )}

              {/* reason tooltip-like */}
              <p className="mt-0.5 text-[11px] text-[#5e5e72]">{s.reason}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
