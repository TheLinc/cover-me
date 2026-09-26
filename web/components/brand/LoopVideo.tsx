'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

type Props = { src: string; poster: string; className?: string; lazy?: boolean }

// Muted decorative loop. preload="none" keeps the poster as the first paint;
// `lazy` waits until the element is near the viewport. With reduced motion the
// video never loads and the poster stays.
export function LoopVideo({ src, poster, className, lazy = false }: Props) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const v = ref.current
    if (!v || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const start = () => v.play().catch(() => {})
    if (!lazy) {
      start()
      return
    }
    const obs = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        obs.disconnect()
        start()
      },
      { rootMargin: '400px' },
    )
    obs.observe(v)
    return () => obs.disconnect()
  }, [lazy])

  return (
    <video
      ref={ref}
      className={cn('pointer-events-none', className)}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden="true"
    />
  )
}
