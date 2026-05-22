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
          {/* ベースグラデ: coral → blue (固定) */}
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
          {/* 光の帯が左から右へ流れる (SMIL) */}
          <stop stopColor="rgba(255,255,255,0)">
            <animate
              attributeName="offset"
              values="-0.3;1.3"
              dur="2s"
              begin={`${flowDelay}s`}
              repeatCount="indefinite"
              calcMode="linear"
            />
            <animate
              attributeName="stop-color"
              values="rgba(255,255,255,0);rgba(255,255,255,0.65);rgba(255,255,255,0)"
              keyTimes="0;0.5;1"
              dur="2s"
              begin={`${flowDelay}s`}
              repeatCount="indefinite"
            />
          </stop>
        </linearGradient>
      </defs>
      <style>{`@keyframes kai-mark-draw { to { stroke-dashoffset: 0; } }`}</style>
    </svg>
  )
}
