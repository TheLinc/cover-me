import { useEffect, useState } from 'react'

const GROW_MS = 800
// A smaller rise reads as tailoring doing nothing, so it counts as none (#228).
const MIN_GAIN = 5

// The ATS match as a ring, the same geometry as the website's ScoreRing.
// With `from` at least MIN_GAIN below `score`, the ring and number grow from the original
// resume's score to the tailored one (#228), unless motion is reduced.
export default function ScoreRing({ score, from, size = 104 }: { score: number; from?: number; size?: number }) {
  const base = typeof from === 'number' && score - from >= MIN_GAIN ? from : score
  const grows = base < score
  const [animate] = useState(() => !matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [shown, setShown] = useState(animate ? base : score)

  useEffect(() => {
    if (!grows || !animate) {
      setShown(score)
      return
    }
    let frame = 0
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / GROW_MS)
      const eased = 1 - (1 - t) ** 3
      setShown(Math.round(base + (score - base) * eased))
      if (t < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [grows, animate, base, score])

  const r = 54
  const c = 2 * Math.PI * r
  const filled = (c * Math.max(0, Math.min(100, shown))) / 100
  const label = grows ? `ATS match ${score} out of 100, up from ${base}` : `ATS match ${score} out of 100`
  return (
    <svg className="score-ring" viewBox="0 0 132 132" width={size} height={size} role="img" aria-label={label}>
      <circle cx="66" cy="66" r={r} fill="none" stroke="var(--elevated)" strokeWidth="10" />
      <circle
        cx="66" cy="66" r={r} fill="none" stroke="var(--accent)" strokeWidth="10" strokeLinecap="round"
        strokeDasharray={`${filled} ${c - filled}`} transform="rotate(-90 66 66)"
      />
      <text x="66" y="70" textAnchor="middle" fill="var(--text)" fontSize="36" fontWeight="600">{shown}</text>
      <text x="66" y="92" textAnchor="middle" fill="var(--text-3)" fontSize="10" letterSpacing="1.5" className="mono">ATS MATCH</text>
    </svg>
  )
}

// The line under the score (#228): the original resume's score when tailoring
// raised it, otherwise why it didn't, so the line is there on every run.
// Nothing for a run from a backend that doesn't send the before score.
export function gainLine(score?: number, before?: number): string | null {
  if (typeof score !== 'number' || typeof before !== 'number') return null
  if (score - before >= MIN_GAIN) return `Up from ${before} before tailoring.${before >= 80 ? ' Your resume already matched well.' : ''}`
  if (score >= 80) return 'Your resume already matched this job well.'
  return 'Your resume already used the keywords it can back up. Add real experience below to raise it.'
}

export function ScoreGain({ score, before }: { score?: number; before?: number }) {
  const line = gainLine(score, before)
  return line && <p className="ats-gain">{line}</p>
}
