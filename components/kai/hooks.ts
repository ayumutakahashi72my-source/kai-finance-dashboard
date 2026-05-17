'use client'

import { useEffect, useState } from 'react'

/**
 * カウントアップアニメ
 * 0 → target をイージング付きで補間する。
 * Direction C のヒーロー数値（金額、%）に使う。
 */
export function useCountUp(
  target: number,
  { duration = 1400, delay = 0 }: {
    duration?: number
    delay?:    number
  } = {},
): number {
  const [value, setValue] = useState(0)

  useEffect(() => {
    let raf: number
    let start: number | null = null
    const ease = (t: number) => 1 - Math.pow(1 - t, 3)

    const startTimer = setTimeout(() => {
      const step = (ts: number) => {
        if (start == null) start = ts
        const t = Math.min(1, (ts - start) / duration)
        setValue(target * ease(t))
        if (t < 1) raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
    }, delay)

    return () => {
      clearTimeout(startTimer)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [target, duration, delay])

  return Math.round(value)
}
