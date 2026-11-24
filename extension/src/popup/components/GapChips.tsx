import { useLayoutEffect, useRef, useState } from 'react'
import { mentions } from '../../lib/ai/resume-grounding'
import { ChevronIcon } from './icons'

const MAX_ROWS = 3

export function nextLimit(tops: number[], limit: number, maxRows = MAX_ROWS): number {
  const rows = [...new Set(tops)].sort((a, b) => a - b)
  if (rows.length <= maxRows) return limit
  const fit = tops.slice(0, limit).filter(t => t <= rows[maxRows - 1]).length
  return fit < limit ? fit : limit - 1
}

// A result saved before requirements were recorded has none, and shows every gap as a keyword (#342).
export function splitGaps(gaps: string[], saved: string[] = []): { requirements: string[]; keywords: string[] } {
  const requirements = saved.filter((r) => gaps.includes(r))
  const keywords = gaps.filter((g) => !requirements.some((r) => r === g || mentions(r, g)))
  return { requirements, keywords }
}

// Matched keywords aren't stored, so only the gaps show (#19).
export default function GapChips({ gaps: all, requirements: saved, rows = MAX_ROWS }: { gaps: string[]; requirements?: string[]; rows?: number }) {
  const { requirements, keywords: gaps } = splitGaps(all, saved)
  const listRef = useRef<HTMLUListElement>(null)
  const growFrom = useRef<number | null>(null)
  const [limit, setLimit] = useState(gaps.length)
  const [expanded, setExpanded] = useState(false)
  const key = gaps.join('\n')

  // Chip widths change once Geist loads, so measure again then (#19).
  useLayoutEffect(() => {
    setLimit(gaps.length)
    setExpanded(false)
    let live = true
    document.fonts?.ready.then(() => { if (live) setLimit(gaps.length) })
    return () => { live = false }
  }, [key])

  // A layout effect runs before paint, so the over-long list never shows (#19).
  useLayoutEffect(() => {
    if (expanded || !listRef.current) return
    const tops = Array.from(listRef.current.children, el => (el as HTMLElement).offsetTop)
    const next = nextLimit(tops, limit, rows)
    if (next !== limit) setLimit(Math.max(0, next))
  })

  useLayoutEffect(() => {
    const el = listRef.current
    const from = growFrom.current
    growFrom.current = null
    if (!el || from === null || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const to = el.offsetHeight
    if (to === from) return
    Object.assign(el.style, { height: `${from}px`, overflow: 'clip' })
    void el.offsetHeight
    Object.assign(el.style, { transition: 'height 0.2s ease', height: `${to}px` })
    el.addEventListener('transitionend', () => Object.assign(el.style, { height: '', overflow: '', transition: '' }), { once: true })
  }, [expanded])

  if (gaps.length === 0 && requirements.length === 0) return null
  const hidden = gaps.length - limit
  const shown = expanded ? gaps : gaps.slice(0, limit)
  return (
    <div className="gap-chips">
      {requirements.length > 0 && (
        <div className="gap-requirements">
          <div className="chip-caption mono">Hard requirements</div>
          <ul className="requirements">
            {requirements.map((r) => <li key={r} className="requirement">{r}</li>)}
          </ul>
        </div>
      )}
      {gaps.length > 0 && <>
      <div className="chip-caption mono">The posting also mentions</div>
      <ul className="chips" ref={listRef} id="gap-chips">
        {shown.map((g, i) => <li key={`${i}-${g}`} className="chip chip-gap">{g}</li>)}
        {/* Shown while expanded too: a late font re-measure can reset limit while open (#19). */}
        {(expanded || hidden > 0) && (
          <li>
            <button
              type="button"
              className="chip chip-more"
              aria-expanded={expanded}
              aria-controls="gap-chips"
              aria-label={expanded ? undefined : `+${hidden} more keywords`}
              onClick={() => { growFrom.current = listRef.current?.offsetHeight ?? null; setExpanded(e => !e) }}
            >
              {expanded ? 'Show less' : `+${hidden} more`}
              <ChevronIcon />
            </button>
          </li>
        )}
      </ul>
      </>}
    </div>
  )
}
