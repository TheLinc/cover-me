// Keywords the posting asks for that the resume doesn't show. Matched
// keywords aren't stored, so only the gaps are shown (visuals stay honest).
export default function GapChips({ gaps }: { gaps: string[] }) {
  if (gaps.length === 0) return null
  return (
    <div>
      <div className="chip-caption mono">MISSING</div>
      <ul className="chips">
        {gaps.map((g, i) => <li key={`${i}-${g}`} className="chip chip-gap">{g}</li>)}
      </ul>
    </div>
  )
}
