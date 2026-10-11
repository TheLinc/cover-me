// The ATS match as a ring, the same geometry as the website's ScoreRing.
export default function ScoreRing({ score, size = 104 }: { score: number; size?: number }) {
  const r = 54
  const c = 2 * Math.PI * r
  const filled = (c * Math.max(0, Math.min(100, score))) / 100
  return (
    <svg className="score-ring" viewBox="0 0 132 132" width={size} height={size} role="img" aria-label={`ATS match ${score} out of 100`}>
      <circle cx="66" cy="66" r={r} fill="none" stroke="var(--elevated)" strokeWidth="10" />
      <circle
        cx="66" cy="66" r={r} fill="none" stroke="var(--accent)" strokeWidth="10" strokeLinecap="round"
        strokeDasharray={`${filled} ${c - filled}`} transform="rotate(-90 66 66)"
      />
      <text x="66" y="70" textAnchor="middle" fill="var(--text)" fontSize="36" fontWeight="600">{score}</text>
      <text x="66" y="92" textAnchor="middle" fill="var(--text-3)" fontSize="10" letterSpacing="1.5" className="mono">ATS MATCH</text>
    </svg>
  )
}
