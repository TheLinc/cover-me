'use client'

import { useEffect, useState, type RefObject } from 'react'

// How far the viewport has travelled through a tall element, 0 at its top
// edge reaching the top of the viewport and 1 when its bottom edge reaches the
// bottom. Drives the pinned story; anything outside it reads the same number.
export function scrollProgress(el: HTMLElement) {
  const r = el.getBoundingClientRect()
  const travel = r.height - window.innerHeight
  return travel > 0 ? Math.min(1, Math.max(0, -r.top / travel)) : 0
}

export function useScrollProgress(ref: RefObject<HTMLElement | null>) {
  const [p, setP] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    const update = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setP(scrollProgress(el)))
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [ref])
  return p
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const on = () => setReduced(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduced
}
