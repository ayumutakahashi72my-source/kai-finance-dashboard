'use client'

import * as React from 'react'

interface BigKaiMarkProps {
  size?: number
  gradientId?: string
  from?: string
  to?: string
  drawDelay?: number
  drawDuration?: number
  glow?: boolean
}

export function BigKaiMark({
  size = 140,
  gradientId = 'big-kai',
  from = '#a78bfa',
  to = '#5eead4',
  drawDelay = 0.1,
  drawDuration = 1.4,
  glow = true,
}: BigKaiMarkProps) {
  const dashLen = 38
  const flowDelay = drawDelay + drawDuration
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      style={{ display: 'block' }}
    >
      {/* ベースパス: coral → blue グラデ */}
      <path
        d="M1 9h2.5l2-4.5 3.5 9 2-4.5H15"
        stroke={`url(#${gradientId})`}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={dashLen}
        strokeDashoffset={dashLen}
        style={{
          animation: `kai-mark-draw ${drawDuration}s ${drawDelay}s cubic-bezier(.65,.05,.36,1) forwards`,
          filter: glow ? `drop-shadow(0 0 3px ${from}88)` : 'none',
        }}
      />
      {/* グリント: coral の光が左→右へ流れる (CSS stroke-dashoffset) */}
      <path
        d="M1 9h2.5l2-4.5 3.5 9 2-4.5H15"
        stroke={from}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeDasharray="2.5 35.5"
        strokeDashoffset={38}
        style={{
          filter: `drop-shadow(0 0 4px ${from}cc)`,
          animation: `${gradientId}-glint 2s ${flowDelay}s linear infinite`,
        }}
      />
      <defs>
        <linearGradient
          id={gradientId}
          x1="1"
          y1="9"
          x2="15"
          y2="9"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      <style>{`
        @keyframes kai-mark-draw { to { stroke-dashoffset: 0; } }
        @keyframes ${gradientId}-glint {
          0%   { stroke-dashoffset: 38; opacity: 0; }
          8%   { opacity: 0.9; }
          88%  { opacity: 0.9; }
          100% { stroke-dashoffset: 0; opacity: 0; }
        }
      `}</style>
    </svg>
  )
}
