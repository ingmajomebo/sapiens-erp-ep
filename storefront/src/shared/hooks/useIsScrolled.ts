import { useEffect, useRef, useState } from 'react'

/**
 * Detecta si la página pasó del centinela (el hero).
 * Usa IntersectionObserver en vez de un listener de scroll: no dispara
 * en cada píxel y no fuerza reflow.
 */
export function useIsScrolled(offsetPx = 80) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) {
      // Sin centinela (rutas sin hero) el header va siempre en su estado sólido
      setScrolled(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { rootMargin: `-${offsetPx}px 0px 0px 0px`, threshold: 0 },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [offsetPx])

  return { sentinelRef, scrolled }
}
