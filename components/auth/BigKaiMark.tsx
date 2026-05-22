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
  const s1 = `${gradientId}-s1`
  const s2 = `${gradientId}-s2`
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      style={{ display: 'block' }}
    >
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
      <defs>
        <linearGradient
          id={gradientId}
          x1="1"
          y1="9"
          x2="15"
          y2="9"
          gradientUnits="userSpaceOnUse"
        >
          <stop id={s1} stopColor={from} />
          <stop id={s2} offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      <style>{`
        @keyframes kai-mark-draw { to { stroke-dashoffset: 0; } }
        @keyframes ${gradientId}-flow1 {
          0%   { stop-color: ${from}; }
          33%  { stop-color: #a78bfa; }
          66%  { stop-color: #22d3ee; }
          100% { stop-color: ${from}; }
        }
        @keyframes ${gradientId}-flow2 {
          0%   { stop-color: ${to}; }
          33%  { stop-color: #fb9477; }
          66%  { stop-color: #a78bfa; }
          100% { stop-color: ${to}; }
        }
        #${s1} { animation: ${gradientId}-flow1 3s 1.4s ease-in-out infinite; }
        #${s2} { animation: ${gradientId}-flow2 3s 1.4s ease-in-out infinite; }
      `}</style>
    </svg>
  )
}
