import type { CSSProperties } from 'react'

// Background depth behind a section: soft color glows, a dot field that fades
// out at its edges, and an outlined rounded square (the shape of the product's
// check marks) that drifts as the page scrolls. The section needs `relative
// isolate`; everything here sits behind its content and ignores the pointer.
type Pos = Pick<CSSProperties, 'left' | 'right' | 'top' | 'bottom'>
const TONES = {
  brand: 'rgba(99, 102, 241, 0.2)',
  warm: 'rgba(249, 115, 22, 0.12)',
}

export function Ambient({
  glows = [],
  dots,
  shape,
}: {
  glows?: (Pos & { size: number; tone: keyof typeof TONES })[]
  dots?: Pos & { w: number; h: number }
  shape?: Pos & { size: number; rotate: number }
}) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      {glows.map(({ size, tone, ...pos }, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{ ...pos, width: size, height: size, background: `radial-gradient(closest-side, ${TONES[tone]}, transparent)` }}
        />
      ))}
      {dots && <span className="dot-field absolute" style={{ left: dots.left, right: dots.right, top: dots.top, bottom: dots.bottom, width: dots.w, height: dots.h }} />}
      {shape && (
        <span className="drift absolute" style={{ left: shape.left, right: shape.right, top: shape.top, bottom: shape.bottom }}>
          <span
            className="relative block rounded-[28%] border-[1.5px] border-[rgba(99,102,241,0.24)]"
            style={{ width: shape.size, height: shape.size, rotate: `${shape.rotate}deg` }}
          >
            <span className="absolute inset-[22%] rounded-[28%] bg-[rgba(99,102,241,0.045)]" />
          </span>
        </span>
      )}
    </div>
  )
}
