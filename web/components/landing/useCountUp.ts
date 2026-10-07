'use client'

import { useEffect, useRef, useState } from 'react'

// Counts from `from` up to `to` the first time the element scrolls into view.
// The server renders `to`, so crawlers, no-JS and reduced-motion visitors see
// the real number; the count-up only animates it.
export function useCountUp<T extends HTMLElement>(to: number, { from = 0, duration = 1600, decimals = 0 } = {}) {
  const ref = useRef<T>(null)
  const [value, setValue] = useState(to)

  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    setValue(from)
    let raf = 0
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        obs.disconnect()
        const start = performance.now()
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / duration)
          setValue(from + (to - from) * (1 - Math.pow(1 - p, 3)))
          if (p < 1) raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      },
      { threshold: 0.4 },
    )
    obs.observe(el)
    return () => {
      obs.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [to, from, duration])

  return [ref, value.toFixed(decimals)] as const
}
