// A line through every anchor, in order. Each step is an S-curve with vertical
// tangents, so offset anchors make it wind and aligned ones make it straight.
// y only ever increases along it, which the timeline's scroll fill relies on.
export function pathThrough(points: { x: number; y: number }[]): string {
  if (points.length === 0) return ''
  return points.reduce((d, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`
    const prev = points[i - 1]
    const mid = (p.y - prev.y) / 2
    return `${d} C ${prev.x} ${prev.y + mid}, ${p.x} ${p.y - mid}, ${p.x} ${p.y}`
  }, '')
}
