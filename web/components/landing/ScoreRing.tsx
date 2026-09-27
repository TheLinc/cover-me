'use client'

import { useCountUp } from './useCountUp'

// ATS match ring from the extension popup. Counts up from `from` to `to`.
export function ScoreRing({ from, to, size = 132 }: { from: number; to: number; size?: number }) {
  const [ref, value] = useCountUp<HTMLDivElement>(to, { from, duration: 1800 })
  const r = 54
  const c = 2 * Math.PI * r
  const filled = (c * Number(value)) / 100
  return (
    <div ref={ref} style={{ width: size, height: size }}>
      <svg viewBox="0 0 132 132" width={size} height={size}>
        <circle cx="66" cy="66" r={r} fill="none" stroke="var(--ext-elevated)" strokeWidth="10" />
        <circle
          cx="66"
          cy="66"
          r={r}
          fill="none"
          stroke="var(--brand)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c - filled}`}
          transform="rotate(-90 66 66)"
        />
        <text x="66" y="68" textAnchor="middle" fill="var(--ext-text)" fontSize="34" fontWeight="600">
          {value}
        </text>
        <text x="66" y="90" textAnchor="middle" fill="var(--ext-muted)" fontSize="10" letterSpacing="1.5" className="font-mono">
          ATS MATCH
        </text>
      </svg>
    </div>
  )
}
