// The ATS ring from the landing page and the extension popup, drawn still and
// in the dashboard's light colours. The ring means the ATS score and nothing
// else on the site. `label` writes "ATS" under the number, for places with no
// caption beside it.
export function AtsRing({ score, size = 52, label = false }: { score: number; size?: number; label?: boolean }) {
  const r = 26
  const c = 2 * Math.PI * r
  const filled = (c * Math.max(0, Math.min(100, score))) / 100
  return (
    <svg role="img" aria-label={`ATS score ${score}`} viewBox="0 0 64 64" width={size} height={size} className="shrink-0">
      <circle cx="32" cy="32" r={r} fill="none" stroke="var(--panel)" strokeWidth="6" />
      <circle cx="32" cy="32" r={r} fill="none" stroke="var(--brand)" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${filled} ${c - filled}`} transform="rotate(-90 32 32)" />
      <text x="32" y={label ? 33 : 38} textAnchor="middle" fill="var(--ink)" fontSize={label ? 19 : 18} fontWeight="600" letterSpacing="-0.5" className="tabular-nums">{score}</text>
      {label && <text x="32" y="45.5" textAnchor="middle" fill="var(--subtle)" fontSize="11" fontWeight="500" letterSpacing="0.5">ATS</text>}
    </svg>
  )
}
