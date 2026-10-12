import { useLayoutEffect, useRef, useState } from 'react'

const MAX_ROWS = 3

// One step toward the largest prefix of chips that, with the "+N more" button
// after it, fits in maxRows wrapped rows. `tops` are the rendered items' top
// offsets: the first `limit` chips, then the button when limit < total. Returns
// `limit` once it fits; the caller re-measures until it does.
export function nextLimit(tops: number[], limit: number, maxRows = MAX_ROWS): number {
  const rows = [...new Set(tops)].sort((a, b) => a - b)
  if (rows.length <= maxRows) return limit
  const fit = tops.slice(0, limit).filter(t => t <= rows[maxRows - 1]).length
  // Chips spill: keep the ones that fit. Only the button spills: drop one chip.
  return fit < limit ? fit : limit - 1
}

// Keywords the posting asks for that the resume doesn't show. Matched
// keywords aren't stored, so only the gaps are shown (visuals stay honest).
export default function GapChips({ gaps }: { gaps: string[] }) {
  const listRef = useRef<HTMLUListElement>(null)
  const [limit, setLimit] = useState(gaps.length)
  const [expanded, setExpanded] = useState(false)
  const key = gaps.join('\n')

  // New gaps, or Geist finishing loading (chip widths change): measure again.
  useLayoutEffect(() => {
    setLimit(gaps.length)
    setExpanded(false)
    let live = true
    document.fonts?.ready.then(() => { if (live) setLimit(gaps.length) })
    return () => { live = false }
  }, [key])

  // Runs before paint, so the over-long list never shows.
  useLayoutEffect(() => {
    if (expanded || !listRef.current) return
    const tops = Array.from(listRef.current.children, el => (el as HTMLElement).offsetTop)
    const next = nextLimit(tops, limit)
    if (next !== limit) setLimit(Math.max(0, next))
  })

  if (gaps.length === 0) return null
  const hidden = gaps.length - limit
  const shown = expanded ? gaps : gaps.slice(0, limit)
  return (
    <div>
      <div className="chip-caption mono">Missing</div>
      <ul className="chips" ref={listRef} id="gap-chips">
        {shown.map((g, i) => <li key={`${i}-${g}`} className="chip chip-gap">{g}</li>)}
        {/* expanded too: a late fonts.ready re-measure can reset limit while open */}
        {(expanded || hidden > 0) && (
          <li>
            <button
              type="button"
              className="chip chip-more"
              aria-expanded={expanded}
              aria-controls="gap-chips"
              aria-label={expanded ? undefined : `+${hidden} more missing keywords`}
              onClick={() => setExpanded(e => !e)}
            >
              {expanded ? 'Show less' : `+${hidden} more`}
            </button>
          </li>
        )}
      </ul>
    </div>
  )
}
