'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

// Lays a product visual out at its design size and scales it down as a whole
// on narrower containers, like a screenshot, instead of letting it reflow.
export function FitScale({ width, height, children }: { width: number; height: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setScale(Math.min(1, entry.contentRect.width / width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [width])
  return (
    <div ref={ref} className="relative w-full" style={{ height: height * scale }}>
      <div className="absolute left-0 top-0 origin-top-left" style={{ width, height, transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  )
}
