import { useEffect, useState } from 'react'

const GROW_MS = 800
// A smaller rise reads as tailoring doing nothing, so it counts as none (#228).
const MIN_GAIN = 5
export const scoreRose = (score?: number, before?: number) =>
  typeof score === 'number' && typeof before === 'number' && score - before >= MIN_GAIN
// Keep the geometry in step with the website's ScoreRing (#19).
export default function ScoreRing({ score, from, grow = true, onGrow, size = 104 }: {
  score: number
  from?: number
  grow?: boolean
  onGrow?: () => void
  size?: number
}) {
  const rose = scoreRose(score, from)
  const start = typeof from !== 'number' ? score : rose ? from : 0
  // Fixed at mount: the page clears `grow` once the fill starts. (#228)
  const [animate] = useState(() => grow && start < score && !matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [shown, setShown] = useState(animate ? start : score)

  useEffect(() => {
    if (!animate) {
      setShown(score)
      return
    }
    onGrow?.()
    let frame = 0
    const t0 = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / GROW_MS)
      const eased = 1 - (1 - t) ** 3
      setShown(Math.round(start + (score - start) * eased))
      if (t < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
    // onGrow is left out: a new callback each render mustn't restart the fill. (#228)
  }, [animate, start, score])

  const r = 54
  const c = 2 * Math.PI * r
  const filled = (c * Math.max(0, Math.min(100, shown))) / 100
  const label = rose ? `Job match ${score} out of 100, up from ${from}` : `Job match ${score} out of 100`
  return (
    <svg className="score-ring" viewBox="0 0 132 132" width={size} height={size} role="img" aria-label={label}>
      <circle cx="66" cy="66" r={r} fill="none" stroke="var(--elevated)" strokeWidth="10" />
      <circle
        cx="66" cy="66" r={r} fill="none" stroke="var(--accent)" strokeWidth="10" strokeLinecap="round"
        strokeDasharray={`${filled} ${c - filled}`} transform="rotate(-90 66 66)"
      />
      <text x="66" y="70" textAnchor="middle" fill="var(--text)" fontSize="36" fontWeight="600">{shown}</text>
      <text x="66" y="92" textAnchor="middle" fill="var(--text-3)" fontSize="10" letterSpacing="1.5" className="mono">JOB MATCH</text>
    </svg>
  )
}

export function gainLine(score?: number, before?: number): string | null {
  if (typeof score !== 'number' || typeof before !== 'number') return null
  if (scoreRose(score, before)) return `Up from ${before} before tailoring.${before >= 80 ? ' Your resume already matched well.' : ''}`
  if (score >= 80) return 'Your resume already matched this job well.'
  return 'Your resume already used the keywords it can back up. Add real experience below to raise it.'
}

export function ScoreGain({ score, before }: { score?: number; before?: number }) {
  const line = gainLine(score, before)
  return line && <p className="ats-gain">{line}</p>
}
