'use client'

import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import Image from 'next/image'
import { ArrowCounterClockwiseIcon, DotsSixVerticalIcon, PlusIcon } from '@phosphor-icons/react/dist/ssr'
import { cn } from '@/lib/utils'
import { Eyebrow } from '@/components/site/Eyebrow'
import { CELLS, EXAMPLE, Hl, Label } from './visuals'
import { Ambient } from './Ambient'

// The integrity rule, as a toy: drag the gap onto the resume and it bounces
// off. Telling Cover Me you really have it (the popup's "Missing something?"
// field) is the only way in, and re-tailoring then counts it.
const GAP = EXAMPLE.gaps[0]
const FULL = Math.round(CELLS.reduce((s, c) => s + c.pts, 0))
const NOTE = `2 years of ${GAP} at Brightline`

type State = 'idle' | 'rejected' | 'note' | 'added'

export function NoFakes() {
  const [state, setState] = useState<State>('idle')
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null)
  const [home, setHome] = useState(true) // chip at rest (animates back)
  const [shake, setShake] = useState(0)
  const [typedNote, setTypedNote] = useState('')
  const start = useRef({ x: 0, y: 0 })
  const chipRef = useRef<HTMLButtonElement>(null)
  const resumeRef = useRef<HTMLDivElement>(null)

  const reject = () => {
    setState('rejected')
    setShake((n) => n + 1)
    setDrag(null)
    setHome(true)
  }

  const onDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (state === 'added') return
    e.currentTarget.setPointerCapture(e.pointerId)
    start.current = { x: e.clientX, y: e.clientY }
    setHome(false)
    setDrag({ x: 0, y: 0 })
  }
  const onMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!drag) return
    setDrag({ x: e.clientX - start.current.x, y: e.clientY - start.current.y })
  }
  const onUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!drag) return
    const moved = Math.hypot(drag.x, drag.y)
    const r = resumeRef.current?.getBoundingClientRect()
    const over = r && e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom
    if (over) reject()
    else if (moved < 6) throwAtResume() // a click or tap
    else {
      setDrag(null)
      setHome(true)
    }
  }

  // Keyboard and tap: the chip flies at the resume on its own and bounces off.
  const throwAtResume = () => {
    const c = chipRef.current?.getBoundingClientRect()
    const r = resumeRef.current?.getBoundingClientRect()
    if (!c || !r) return reject()
    setHome(false)
    setDrag({ x: r.left + r.width * 0.45 - (c.left + c.width / 2), y: r.top + r.height * 0.7 - (c.top + c.height / 2) })
    window.setTimeout(reject, 380)
  }

  const addForReal = () => {
    setState('note')
    let i = 0
    const id = window.setInterval(() => {
      i += 1
      setTypedNote(NOTE.slice(0, i))
      if (i >= NOTE.length) {
        clearInterval(id)
        window.setTimeout(() => setState('added'), 500)
      }
    }, 38)
  }

  const reset = () => {
    setState('idle')
    setTypedNote('')
    setDrag(null)
    setHome(true)
  }

  const added = state === 'added'

  return (
    <section className="container relative isolate py-28 max-md:py-20">
      <Ambient
        glows={[{ right: -100, top: 0, size: 680, tone: 'warm' }]}
        shape={{ right: -30, top: 40, size: 96, rotate: -10 }}
      />
      <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,640px)]">
        <div className="flex flex-col gap-5">
          <Eyebrow>Honest by design</Eyebrow>
          <h2 className="text-[clamp(32px,3.6vw,48px)] leading-[1.05]">It won&apos;t add skills you don&apos;t have</h2>
          <p className="max-w-[440px] text-[17px] leading-[1.55] text-ink-2">
            Gaps stay gaps. Try putting {GAP} on the resume.
          </p>
        </div>

        <div className="stage-grid relative flex flex-col items-center gap-6 rounded-[28px] p-8 max-md:p-4 sm:flex-row sm:items-start">
          {/* The gap, waiting to be dragged */}
          <div className="flex shrink-0 flex-col items-center gap-2 sm:w-[150px] sm:pt-16">
            <button
              ref={chipRef}
              type="button"
              disabled={added}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  throwAtResume()
                }
              }}
              aria-label={`Try adding ${GAP} to the resume`}
              className={cn(
                'relative z-20 flex touch-none select-none items-center gap-1.5 rounded-[10px] border-2 border-dashed border-gap bg-gap-tint py-2 pl-1.5 pr-3 text-[14px] font-semibold text-gap-ink shadow-[0_10px_24px_-12px_rgba(154,52,18,0.5)]',
                drag && !home ? 'cursor-grabbing' : 'cursor-grab',
                home && 'transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
                added && 'invisible',
              )}
              style={{ transform: drag ? `translate(${drag.x}px, ${drag.y}px) rotate(${Math.max(-8, Math.min(8, drag.x / 30))}deg)` : 'none' }}
            >
              <DotsSixVerticalIcon size={16} weight="bold" />
              {GAP}
            </button>
            <span className={cn('whitespace-nowrap font-mono text-[11px] text-subtle transition-opacity', state !== 'idle' && 'opacity-0')}>
              Drag onto the resume
            </span>
          </div>

          {/* The resume it bounces off */}
          <div
            key={shake}
            ref={resumeRef}
            className={cn(
              'relative flex w-full max-w-[420px] flex-col gap-3 rounded-[18px] bg-white p-6 shadow-[0_30px_70px_-30px_rgba(30,27,75,0.4)]',
              shake > 0 && 'shake',
              drag && !home && 'outline-dashed outline-2 outline-offset-4 outline-gap',
            )}
          >
            <div className="flex items-center justify-between">
              <Label>Your resume</Label>
              <span className="flex items-baseline gap-1 rounded-full bg-brand-tint px-2.5 py-1 text-[11px] text-brand-ink">
                ATS match
                <span key={String(added)} className="animate-[fadeUp_.4s_ease] font-semibold">{added ? FULL : EXAMPLE.score}</span>
              </span>
            </div>
            <div className="text-[17px] font-semibold text-ink">{EXAMPLE.candidate}</div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-2">Experience</div>
            {EXAMPLE.bullets.map(({ after: [a, k, b] }) => (
              <p key={k} className="-mt-1 text-[12.5px] leading-[1.5] text-body">{a}<Hl>{k}</Hl>{b}</p>
            ))}
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-2">Skills</div>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLE.skillsAfter.map((s) => (
                <Hl key={s} className="text-[12px]">{s}</Hl>
              ))}
              {added && <Hl className="animate-[fadeUp_.45s_ease] text-[12px] font-semibold">{GAP}</Hl>}
            </div>

            {/* What Cover Me says back */}
            <div className="mt-1 min-h-[104px]">
              {state === 'rejected' && (
                <div className="flex animate-[fadeUp_.35s_ease] flex-col gap-3 rounded-[14px] bg-ext-bg p-4 text-[13px] leading-[1.5] text-ext-text">
                  <span className="flex items-center gap-2 font-semibold">
                    <Image src="/logo.png" width={16} height={16} alt="" className="rounded-[4px]" />
                    {GAP} isn&apos;t on your resume, so it stays off.
                  </span>
                  <button
                    type="button"
                    onClick={addForReal}
                    className="flex w-fit items-center gap-1.5 rounded-[9px] bg-brand px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-brand-strong"
                  >
                    <PlusIcon size={13} weight="bold" />
                    I do have {GAP} experience
                  </button>
                </div>
              )}
              {state === 'note' && (
                <div className="flex animate-[fadeUp_.35s_ease] flex-col gap-2 rounded-[14px] bg-ext-bg p-4 text-[12px] text-ext-muted">
                  Missing something?
                  <div className="rounded-[9px] border border-ext-border bg-ext-surface px-3 py-2 text-[13px] text-ext-text">
                    {typedNote}
                    <span className="ml-px inline-block h-[13px] w-[2px] translate-y-[2px] animate-pulse bg-brand" />
                  </div>
                </div>
              )}
              {added && (
                <div className="flex animate-[fadeUp_.35s_ease] items-center justify-between gap-3 rounded-[14px] bg-brand-tint p-4 text-[13px] leading-[1.5] text-brand-ink">
                  <span>Re-tailored with your note. Now it counts, because it&apos;s true.</span>
                  <button type="button" onClick={reset} aria-label="Reset" className="rounded-[8px] p-1.5 hover:bg-white">
                    <ArrowCounterClockwiseIcon size={15} weight="bold" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
