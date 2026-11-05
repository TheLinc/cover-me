'use client'

import { useEffect, useRef } from 'react'
import type { RoadmapItem } from '@/lib/roadmap'
import { RoadmapCard } from './RoadmapCard'
import { pathThrough } from './path-through'

export interface TimelineGroup { title: string; items: RoadmapItem[] }

// Cards and nodes are placed by CSS. On desktop the nodes sit off-centre
// towards their card, so the line winds; on mobile they share one x, so it's
// straight. The line is drawn from where the nodes landed, and the purple copy
// fills to 60% down the viewport as the page scrolls.
export function RoadmapTimeline({ groups }: { groups: TimelineGroup[] }) {
  const listRef = useRef<HTMLOListElement>(null)
  const trackRef = useRef<SVGPathElement>(null)
  const fillRef = useRef<SVGPathElement>(null)

  useEffect(() => {
    const list = listRef.current, track = trackRef.current, fill = fillRef.current
    if (!list || !track || !fill) return
    let length = 0
    let samples: number[] = [] // y at evenly spaced lengths along the line
    let anchors: { row: HTMLElement; y: number }[] = []
    let raf = 0

    const fillTo = () => {
      const target = window.innerHeight * 0.6 - list.getBoundingClientRect().top
      let i = samples.findIndex((y) => y > target)
      if (i === -1) i = samples.length
      const filled = samples.length ? (length * Math.max(0, i - 1)) / (samples.length - 1) : 0
      fill.style.strokeDashoffset = String(length - filled)
      for (const a of anchors) a.row.dataset.reached = String(a.y <= target)
    }

    const layout = () => {
      const box = list.getBoundingClientRect()
      const nodes = [...list.querySelectorAll<HTMLElement>('[data-anchor]')]
      const points = nodes.map((n) => {
        const r = n.getBoundingClientRect()
        return { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top }
      })
      anchors = nodes.map((n, i) => ({ row: n.closest('li') as HTMLElement, y: points[i].y }))
      const d = pathThrough(points)
      track.setAttribute('d', d)
      fill.setAttribute('d', d)
      length = fill.getTotalLength()
      fill.style.strokeDasharray = String(length)
      samples = Array.from({ length: 301 }, (_, i) => fill.getPointAtLength((length * i) / 300).y)
      fillTo()
    }

    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(fillTo)
    }
    const resize = new ResizeObserver(layout)
    resize.observe(list)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      resize.disconnect()
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  let side = 0
  return (
    <ol ref={listRef} className="relative flex flex-col gap-8 md:gap-0">
      <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
        <path ref={trackRef} fill="none" stroke="var(--line)" strokeWidth={2} strokeLinecap="round" />
        <path ref={fillRef} fill="none" stroke="var(--brand)" strokeWidth={2.5} strokeLinecap="round" />
      </svg>
      {groups.flatMap((g) => [
        <li key={g.title} className="group relative flex md:justify-center md:py-10 md:first:pt-0">
          <span data-anchor className="absolute left-3 top-1/2 h-px w-px md:left-1/2" />
          <h2 className="relative ml-9 rounded-full border border-line bg-surface px-4 py-1.5 text-[14px] font-medium text-ink transition-colors motion-reduce:transition-none group-data-[reached=true]:border-brand-strong group-data-[reached=true]:bg-brand-strong group-data-[reached=true]:text-white md:ml-0">
            {g.title}
          </h2>
        </li>,
        ...g.items.map((item) => {
          const left = side++ % 2 === 0
          return (
            <li key={item.number} className="group relative md:grid md:grid-cols-2 md:gap-x-32 md:[&+&]:-mt-8">
              <span
                data-anchor
                className={`absolute left-3 top-7 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-line bg-surface transition-colors motion-reduce:transition-none group-data-[reached=true]:border-brand group-data-[reached=true]:bg-brand ${left ? 'md:left-[calc(50%-44px)]' : 'md:left-[calc(50%+44px)]'}`}
              />
              <div className={`pl-9 md:pl-0 ${left ? '' : 'md:col-start-2'}`}>
                <RoadmapCard item={item} />
              </div>
            </li>
          )
        }),
      ])}
    </ol>
  )
}
