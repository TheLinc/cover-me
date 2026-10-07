'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

// Lays a product visual out at its design size and scales it down as a whole
// on narrower containers, like a screenshot, instead of letting it reflow.
// `contain` also fits the container's height (the container must have one)
// and centres the visual in it.
export function FitScale({ width, height, contain, children }: { width: number; height: number; contain?: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ scale: 1, w: width, h: height })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width: w, height: h } = entry.contentRect
      setBox({ scale: Math.min(1, w / width, contain && h > 0 ? h / height : 1), w, h })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [width, height, contain])
  const { scale } = box
  if (contain) {
    return (
      <div ref={ref} className="relative h-full w-full">
        <div
          className="absolute origin-top-left"
          style={{
            width,
            height,
            left: (box.w - width * scale) / 2,
            top: (box.h - height * scale) / 2,
            transform: `scale(${scale})`,
          }}
        >
          {children}
        </div>
      </div>
    )
  }
  return (
    <div ref={ref} className="relative w-full" style={{ height: height * scale }}>
      <div className="absolute left-0 top-0 origin-top-left" style={{ width, height, transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  )
}
