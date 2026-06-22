import { useRef, useCallback, useEffect } from 'react'

interface SwipeDismissOptions {
  onDismiss: () => void
  threshold?: number
}

export function useSwipeDismiss({ onDismiss, threshold = 100 }: SwipeDismissOptions) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef({ startY: 0, currentY: 0, dragging: false })
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
    }
  }, [])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const el = sheetRef.current
    if (!el) return
    const scrollEl = el.querySelector('[data-swipe-scroll]') as HTMLElement | null
    if (scrollEl && scrollEl.contains(e.target as Node)) return
    if (!scrollEl && el.scrollTop > 8) return
    dragRef.current = { startY: e.touches[0].clientY, currentY: e.touches[0].clientY, dragging: true }
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragRef.current.dragging || !sheetRef.current) return
    const dy = e.touches[0].clientY - dragRef.current.startY
    dragRef.current.currentY = e.touches[0].clientY
    if (dy > 0) {
      sheetRef.current.style.transform = `translateY(${dy}px)`
      sheetRef.current.style.transition = 'none'
    }
  }, [])

  const onTouchEnd = useCallback(() => {
    if (!dragRef.current.dragging || !sheetRef.current) return
    const dy = dragRef.current.currentY - dragRef.current.startY
    dragRef.current.dragging = false
    if (dy > threshold) {
      sheetRef.current.style.transition = 'transform .2s ease-out'
      sheetRef.current.style.transform = 'translateY(100%)'
      dismissTimerRef.current = setTimeout(onDismiss, 200)
    } else {
      sheetRef.current.style.transition = 'transform .2s ease-out'
      sheetRef.current.style.transform = 'translateY(0)'
    }
  }, [onDismiss, threshold])

  return { sheetRef, onTouchStart, onTouchMove, onTouchEnd }
}
