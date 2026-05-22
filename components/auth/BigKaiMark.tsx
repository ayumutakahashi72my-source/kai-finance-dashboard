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
  const gradRef = React.useRef<SVGLinearGradientElement>(null)

  React.useEffect(() => {
    // Gradient spans 2× the path width (−13 to 15 = 28 units).
    // Stops: to(blue)@0%, from(coral)@50%, to(blue)@100%.
    // Translating +14 units (one period) shifts the gradient right → colors move left.
    const PERIOD = 2000
    const SHIFT = 14
    let frame: number
    let startT: number | null = null
    const mountTime = performance.now()

    const tick = (t: number) => {
      if (t - mountTime < flowDelay * 1000) {
        frame = requestAnimationFrame(tick)
        return
      }
      if (startT === null) startT = t
      const shift = ((t - startT) % PERIOD) / PERIOD * SHIFT
      gradRef.current?.setAttribute('gradientTransform', `translate(${shift}, 0)`)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [flowDelay])

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
        {/* x1=−13, x2=15 → gradient spans 28 units (2× path width of 14).
            Tiling pattern: to→from→to, so translate(14,0) loops seamlessly. */}
        <linearGradient
          ref={gradRef}
          id={gradientId}
          x1="-13"
          y1="9"
          x2="15"
          y2="9"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%"   stopColor={to}   />
          <stop offset="50%"  stopColor={from} />
          <stop offset="100%" stopColor={to}   />
        </linearGradient>
      </defs>
      <style>{`@keyframes kai-mark-draw { to { stroke-dashoffset: 0; } }`}</style>
    </svg>
  )
}
