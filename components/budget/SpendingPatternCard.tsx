'use client'

interface SpendingPattern {
  summary: string
  habits: string[]
}

interface Props {
  pattern: SpendingPattern
}

export function SpendingPatternCard({ pattern }: Props) {
  return (
    <div
      className="rounded-[18px] p-4"
      style={{
        background: 'linear-gradient(135deg,rgba(167,139,250,0.08),rgba(20,22,32,0.66))',
        backdropFilter: 'blur(24px) saturate(160%)',
        border: '1px solid rgba(167,139,250,0.16)',
      }}
    >
      <div className="mb-3 flex items-center gap-2">
        <span
          className="mono flex h-6 w-6 items-center justify-center rounded-[7px] text-[11px] font-black text-[#0a0a10]"
          style={{ background: 'linear-gradient(135deg,#a78bfa,#5eead4)' }}
        >
          AI
        </span>
        <span className="text-[13px] font-bold text-[#a78bfa]">支出クセ</span>
      </div>

      <p className="mb-3 text-[14px] leading-[1.75] text-[#c4c4d0]">{pattern.summary}</p>

      <ul className="space-y-2">
        {pattern.habits.map((habit, i) => (
          <li key={i} className="flex items-start gap-2">
            <span
              className="mono mt-[2px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-[#0a0a10]"
              style={{ background: 'rgba(167,139,250,0.7)' }}
            >
              {i + 1}
            </span>
            <span className="text-[13px] leading-[1.6] text-[#c4c4d0]">{habit}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
