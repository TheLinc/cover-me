'use client'

import { useEffect, useRef, useState } from 'react'
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr'
import { cn } from '@/lib/utils'
import { Eyebrow } from '@/components/site/Eyebrow'
import { FitScale } from './FitScale'
import { EXAMPLE } from './visuals'
import { Ambient } from './Ambient'

// A recruiter searching their applicant tracking system for the posting's
// words. The tailored resume uses those words (see EXAMPLE.bullets), the
// original doesn't, so only one of them comes back. Other applicants are made up.
const TERMS = EXAMPLE.bullets.map((b) => b.after[1])
const OTHERS = [
  { name: 'Jordan Lee', title: 'Growth Marketer', hits: TERMS },
  { name: 'Priya Shah', title: 'Marketing Manager', hits: [TERMS[0], TERMS[2]] },
  { name: 'Sam Okafor', title: 'Digital Marketing Lead', hits: [TERMS[1], TERMS[2]] },
  { name: 'Dana Cruz', title: 'Brand Manager', hits: [TERMS[0]] },
]
const YOU = { name: EXAMPLE.candidate, title: 'Marketing Lead · Brightline' }

const W = 720
const NARROW_W = 400 // phones: rows drop their term chips and keep the count
const ROW_H = 64
const LIST_TOP = 150

function Row({ name, title, hits, you, top, faded, narrow }: { name: string; title: string; hits: string[]; you?: boolean; top: number; faded?: boolean; narrow?: boolean }) {
  return (
    <div
      className={cn(
        'absolute inset-x-5 flex h-[54px] items-center gap-3.5 rounded-[12px] px-3.5 transition-[top,opacity,background-color,box-shadow] duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)]',
        you && !faded && 'bg-brand-tint shadow-[0_0_0_1.5px_var(--brand)]',
        faded && 'border border-dashed border-line opacity-80',
      )}
      style={{ top }}
    >
      <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-[10px] text-[13px] font-semibold', you ? 'bg-brand text-white' : 'bg-panel text-ink-2')}>
        {name.split(' ').map((w) => w[0]).join('')}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-[14px] font-semibold text-ink">
          {name}
          {you && <span className="rounded-[5px] bg-ink px-1.5 py-px text-[10px] font-medium text-white">You</span>}
        </div>
        <div className="text-[12px] text-subtle">{title}</div>
      </div>
      <div className={cn('flex gap-1', narrow && 'hidden')}>
        {TERMS.map((t) => (
          <span
            key={t}
            className={cn(
              'rounded-[6px] px-2 py-0.5 text-[11px] transition-colors duration-500',
              hits.includes(t) ? 'bg-white text-brand-ink shadow-[inset_0_0_0_1px_#DCDCFE]' : 'text-[#C9C3BC] line-through',
            )}
          >
            {t}
          </span>
        ))}
      </div>
      <span className={cn('w-10 text-right font-mono text-[12px]', hits.length === TERMS.length ? 'text-brand-strong' : 'text-subtle')}>
        {hits.length}/{TERMS.length}
      </span>
    </div>
  )
}

function AtsWindow({ tailored, narrow }: { tailored: boolean; narrow?: boolean }) {
  // Tailored: you sit second, behind the one other full match, and everyone
  // below moves down a row.
  const slot = (i: number) => (tailored && i > 0 ? i + 1 : i)
  const youIndex = tailored ? 1 : OTHERS.length + 0.35
  return (
    <div className="relative overflow-hidden rounded-[20px] bg-white shadow-[0_30px_80px_-36px_rgba(30,27,75,0.45)]" style={{ width: narrow ? NARROW_W : W, height: 520 }}>
      <div className="flex h-11 items-center gap-2 border-b border-line bg-[#FAF9F8] px-5 text-[12px] text-subtle">
        <span className="font-semibold text-ink-2">Applicants</span>
        <span>·</span>
        <span className="truncate">{EXAMPLE.role}, {EXAMPLE.company}</span>
        <span className="ml-auto font-mono text-[11px]">214 applied</span>
      </div>
      <div className="mx-5 mt-4 flex h-11 items-center gap-2 rounded-[12px] border border-line px-3.5">
        <MagnifyingGlassIcon size={16} className="text-subtle" />
        {TERMS.map((t) => (
          <span key={t} className="rounded-[7px] bg-ink px-2 py-1 text-[12px] font-medium text-white">{t}</span>
        ))}
      </div>
      <div className="mx-5 mt-4 flex items-center justify-between text-[12px] text-subtle">
        <span>Best matches</span>
        <span className="font-mono">{tailored ? 5 : 4} results</span>
      </div>
      {OTHERS.map((r, i) => (
        <Row key={r.name} {...r} narrow={narrow} top={LIST_TOP + slot(i) * ROW_H} />
      ))}
      <Row
        {...YOU}
        hits={tailored ? TERMS : []}
        you
        narrow={narrow}
        faded={!tailored}
        top={LIST_TOP + youIndex * ROW_H}
      />
      {!tailored && (
        <div
          className="absolute inset-x-5 text-center font-mono text-[11px] text-subtle"
          style={{ top: LIST_TOP + (youIndex + 1) * ROW_H - 4 }}
        >
          Not in the results. Your resume says it differently.
        </div>
      )}
    </div>
  )
}

export function FoundInSearch() {
  const [tailored, setTailored] = useState(false)
  const [auto, setAuto] = useState(true)
  const ref = useRef<HTMLDivElement>(null)

  // Flip between the two resumes while in view, until the visitor picks one.
  useEffect(() => {
    if (!auto || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let id = 0
    const obs = new IntersectionObserver(([e]) => {
      clearInterval(id)
      if (e.isIntersecting) id = window.setInterval(() => setTailored((t) => !t), 3200)
    }, { threshold: 0.5 })
    if (ref.current) obs.observe(ref.current)
    return () => {
      obs.disconnect()
      clearInterval(id)
    }
  }, [auto])

  const pick = (t: boolean) => {
    setAuto(false)
    setTailored(t)
  }

  return (
    <section className="container relative isolate py-28 max-md:py-20">
      <Ambient
        glows={[{ right: -120, top: 0, size: 720, tone: 'brand' }]}
        dots={{ left: -60, top: 40, w: 420, h: 320 }}
        shape={{ left: -40, bottom: 30, size: 130, rotate: 12 }}
      />
      <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,720px)]">
        <div className="flex flex-col gap-5">
          <Eyebrow>Why the wording matters</Eyebrow>
          <h2 className="text-[clamp(32px,3.6vw,48px)] leading-[1.05]">Recruiters search for the posting&apos;s words. Tailored, you show up.</h2>
          <p className="max-w-[440px] text-[17px] leading-[1.55] text-ink-2">
            Same experience, different words. &ldquo;Managed paid media spend&rdquo; never matches a search for &ldquo;budget&rdquo;.
          </p>
          <div role="radiogroup" aria-label="Which resume" className="flex w-fit gap-1 rounded-full bg-panel p-1">
            {[
              [false, 'Original resume'],
              [true, 'Tailored by Cover Me'],
            ].map(([v, label]) => (
              <button
                key={String(v)}
                role="radio"
                aria-checked={tailored === v}
                onClick={() => pick(v as boolean)}
                className={cn(
                  'rounded-full px-4 py-2 text-[13px] font-medium transition-colors duration-300',
                  tailored === v ? 'bg-ink text-white' : 'text-ink-2 hover:text-ink',
                )}
              >
                {label as string}
              </button>
            ))}
          </div>
        </div>
        <div ref={ref} inert aria-hidden="true">
          <div className="max-sm:hidden">
            <FitScale width={W} height={520}>
              <AtsWindow tailored={tailored} />
            </FitScale>
          </div>
          <div className="sm:hidden">
            <FitScale width={NARROW_W} height={520}>
              <AtsWindow tailored={tailored} narrow />
            </FitScale>
          </div>
        </div>
      </div>
    </section>
  )
}
