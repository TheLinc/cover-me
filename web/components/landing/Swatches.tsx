import { PatternNote } from '@/components/brand/PatternNote'
import { FEATURES } from './content'

// Three fabric tints; all keep --ink-2 body text above 4.5:1.
const TINTS = ['#E8DCC6', '#EADFCB', '#E3D5BB']

export function Swatches() {
  return (
    <section id="features" className="py-28 max-md:py-20">
      <div className="container">
        <div className="reveal mb-14 flex max-w-[640px] flex-col gap-4">
          <PatternNote>Features</PatternNote>
          <h2 className="text-[clamp(34px,4.4vw,58px)] leading-none text-ink">What makes Cover Me different?</h2>
        </div>
        <ul className="grid grid-cols-3 gap-5 max-lg:grid-cols-2 max-md:grid-cols-1">
          {FEATURES.map((f, i) => (
            <li key={f.title} className="swatch reveal flex flex-col gap-3 px-7 py-10" style={{ background: TINTS[i % 3] }}>
              <PatternNote>Swatch {String(i + 1).padStart(2, '0')}</PatternNote>
              <h3 className="font-display text-[22px] leading-[1.2] text-ink">{f.title}</h3>
              <p className="text-[14px] leading-[1.75] text-ink-2">{f.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
