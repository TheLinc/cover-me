'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { CheckIcon } from '@phosphor-icons/react/dist/ssr'
import { cn } from '@/lib/utils'
import { ProgressStep } from './ExtensionPopup'
import { FitScale } from './FitScale'
import { BrowserFrame, EXAMPLE, Hl, Label, Line } from './visuals'

// The hero's product shot, laid out as a flow with nothing stacked: the posting
// on top, Cover Me in the middle saying what it is doing, and the two outputs
// side by side below. Cards never move; only their contents change, one at a
// time. It opens on the finished result (as the server renders it), holds,
// then replays the run slowly. Reduced motion stays on the result.
const LOOP = 21000
const READ = 6000 // requirements light up on the posting
const TAILOR = 9500 // resume bullets are rewritten, then scored
const LETTER = 14000 // the letter is written
const DONE = 18500 // back to the finished frame

type Phase = 'done' | 'read' | 'tailor' | 'letter'
const phaseAt = (t: number): Phase => (t < READ || t >= DONE ? 'done' : t < TAILOR ? 'read' : t < LETTER ? 'tailor' : 'letter')
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

function useLoopClock() {
  const [t, setT] = useState(0)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const start = performance.now()
    const id = window.setInterval(() => setT((performance.now() - start) % LOOP), 100)
    return () => clearInterval(id)
  }, [])
  return t
}

const W = 560
const H = 520
const POST_H = 112
const DOCS_Y = 196
const RESUME = { left: 0, w: 320 }
const LETTER_CARD = { left: 340, w: 220 }
const rewriteAt = (i: number) => TAILOR + 600 + i * 1400
const SCORE_AT = rewriteAt(EXAMPLE.bullets.length - 1) + 700
const LETTER_TEXT = EXAMPLE.letter.join('\n\n')

// Every card keeps its place; the one being worked on gets an indigo outline.
const card = (active: boolean) =>
  cn(
    'absolute rounded-[18px] transition-shadow duration-500',
    active
      ? 'shadow-[0_0_0_2px_rgba(99,102,241,0.55),0_24px_60px_-28px_rgba(30,27,75,0.45)]'
      : 'shadow-[0_0_0_1px_rgba(30,27,75,0.08),0_24px_60px_-28px_rgba(30,27,75,0.35)]',
  )

function Posting({ lit, active }: { lit: number; active: boolean }) {
  return (
    <div className={cn(card(active), 'rounded-[16px]')} style={{ left: 0, top: 0, width: W, height: POST_H }}>
      <BrowserFrame
        url="boards.greenhouse.io/northwind"
        className="h-full shadow-none"
        toolbar={
          <span className="ml-2 flex size-6 items-center justify-center rounded-[7px] bg-white">
            <Image src="/logo.png" width={16} height={16} alt="" className="rounded-[4px]" />
          </span>
        }
      >
        <div className="flex h-full items-center gap-5 px-4">
          <div className="flex shrink-0 items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-[9px] bg-ink text-[13px] font-semibold text-white">N</div>
            <div className="leading-tight">
              <div className="text-[13px] font-semibold text-ink">{EXAMPLE.role}</div>
              <div className="text-[11px] text-subtle">{EXAMPLE.company} · Job posting</div>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-1">
            {EXAMPLE.keywords.map((k, i) => (
              <span
                key={k}
                className={cn(
                  'rounded-[6px] px-1.5 py-0.5 text-[10.5px] transition-colors duration-500',
                  i < lit ? 'bg-brand-tint text-brand-ink' : 'bg-[#F2F0ED] text-subtle',
                )}
              >
                {k}
              </span>
            ))}
          </div>
        </div>
      </BrowserFrame>
    </div>
  )
}

// Cover Me between the posting and the outputs, saying what it is doing.
const STATUS: Record<Phase, string> = {
  read: 'Reading the posting',
  tailor: 'Rewriting your resume',
  letter: 'Writing your cover letter',
  done: 'Ready to apply',
}

function Connectors({ phase }: { phase: Phase }) {
  const mid = W / 2
  const pillTop = POST_H + 18
  const pillBottom = pillTop + 34
  const left = RESUME.left + RESUME.w / 2
  const right = LETTER_CARD.left + LETTER_CARD.w / 2
  const line = (on: boolean) => (on ? 'flow-line stroke-[var(--brand)]' : 'stroke-[#BFB8B0]')
  return (
    <>
      <svg className="absolute inset-0" width={W} height={DOCS_Y} fill="none" strokeWidth="2">
        <path d={`M${mid} ${POST_H} V${pillTop}`} className={line(phase === 'read')} />
        <path d={`M${mid} ${pillBottom} C${mid} ${DOCS_Y - 6}, ${left} ${pillBottom + 4}, ${left} ${DOCS_Y}`} className={line(phase === 'tailor')} />
        <path d={`M${mid} ${pillBottom} C${mid} ${DOCS_Y - 6}, ${right} ${pillBottom + 4}, ${right} ${DOCS_Y}`} className={line(phase === 'letter')} />
      </svg>
      <div
        className="absolute flex h-[34px] -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-ext-border bg-ext-bg px-3 text-ext-text shadow-[0_14px_30px_-14px_rgba(15,14,40,0.6)]"
        style={{ left: mid, top: pillTop }}
      >
        <Image src="/logo.png" width={16} height={16} alt="" className="rounded-[4px]" />
        <ul key={phase} className="animate-[fadeIn_.4s_ease]">
          <ProgressStep state={phase === 'done' ? 'done' : 'active'}>{STATUS[phase]}</ProgressStep>
        </ul>
      </div>
    </>
  )
}

// A light version of the popup's ring, for the resume's header.
function MiniScore({ value }: { value: number | null }) {
  const r = 15
  const c = 2 * Math.PI * r
  return (
    <div className={cn('flex items-center gap-2 transition-opacity duration-500', value === null && 'opacity-0')}>
      <span className="text-right font-mono text-[9.5px] uppercase leading-[1.2] tracking-[0.06em] text-subtle">
        ATS<br />match
      </span>
      <svg width="38" height="38" viewBox="0 0 38 38">
        <circle cx="19" cy="19" r={r} fill="none" stroke="var(--brand-tint)" strokeWidth="4" />
        <circle
          cx="19"
          cy="19"
          r={r}
          fill="none"
          stroke="var(--brand)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${(c * (value ?? 0)) / 100} ${c}`}
          transform="rotate(-90 19 19)"
        />
        <text x="19" y="23" textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--ink)">
          {value ?? 0}
        </text>
      </svg>
    </div>
  )
}

// The first bullet keeps its original, struck through, above the rewrite.
function Resume({ t, phase }: { t: number; phase: Phase }) {
  const finished = phase === 'done' || phase === 'letter'
  const rewritten = (i: number) => finished || (phase === 'tailor' && t >= rewriteAt(i))
  const score = finished
    ? EXAMPLE.score
    : phase === 'tailor' && t >= SCORE_AT
      ? Math.round(EXAMPLE.score * clamp01((t - SCORE_AT) / 900))
      : null
  return (
    <div
      className={cn(card(phase === 'tailor'), 'flex flex-col gap-2 overflow-hidden bg-white p-5')}
      style={{ left: RESUME.left, top: DOCS_Y, width: RESUME.w, height: H - DOCS_Y }}
    >
      <div className="flex h-[38px] items-center justify-between">
        <Label>Your resume</Label>
        <MiniScore value={score} />
      </div>
      <div className="text-[16px] font-semibold leading-tight text-ink">{EXAMPLE.candidate}</div>
      <div className="-mt-1 text-[11px] text-subtle">Marketing Lead · Brightline</div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-2">Experience</div>
      {EXAMPLE.bullets.map((b, i) => {
        const done = rewritten(i)
        return (
          <div key={b.before} className="flex flex-col gap-0.5">
            {i === 0 && done && (
              <p className="animate-[fadeIn_.5s_ease] text-[10.5px] leading-[1.4] text-subtle line-through">{b.before}</p>
            )}
            <p key={String(done)} className="animate-[fadeIn_.5s_ease] text-[12px] leading-[1.45] text-body">
              {done ? <>{b.after[0]}<Hl className="font-medium">{b.after[1]}</Hl>{b.after[2]}</> : b.before}
            </p>
          </div>
        )
      })}
    </div>
  )
}

// Warm paper so it reads as a different document from the resume.
function Letter({ t, phase }: { t: number; phase: Phase }) {
  const chars =
    phase === 'done'
      ? LETTER_TEXT.length
      : phase === 'letter'
        ? Math.floor(LETTER_TEXT.length * clamp01((t - LETTER - 300) / (DONE - LETTER - 1000)))
        : 0
  return (
    <div
      className={cn(card(phase === 'letter'), 'flex flex-col gap-2 overflow-hidden bg-[#FBF7EF] p-5')}
      style={{ left: LETTER_CARD.left, top: DOCS_Y, width: LETTER_CARD.w, height: H - DOCS_Y }}
    >
      <div className="flex h-[38px] items-center">
        <Label>Cover letter</Label>
      </div>
      {chars > 0 ? (
        <>
          <div className="text-[12px] font-semibold text-ink">Dear {EXAMPLE.company} team,</div>
          <p className="whitespace-pre-line text-[11px] leading-[1.6] text-body">{LETTER_TEXT.slice(0, chars)}</p>
          {chars === LETTER_TEXT.length && (
            <div className="mt-auto flex animate-[fadeIn_.5s_ease] flex-col gap-1.5">
              <Line w="92%" className="h-[6px] bg-[#EEE7DA]" />
              <Line w="70%" className="h-[6px] bg-[#EEE7DA]" />
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-2.5 pt-1">
          {['60%', '96%', '90%', '94%', '72%'].map((w, i) => (
            <Line key={i} w={w} className="h-[6px] bg-[#EEE7DA]" />
          ))}
        </div>
      )}
    </div>
  )
}

function Scene({ t }: { t: number }) {
  const phase = phaseAt(t)
  const n = EXAMPLE.keywords.length
  const lit = phase === 'read' ? Math.floor(n * clamp01((t - READ - 300) / (TAILOR - READ - 800))) : n
  return (
    <div className="relative" style={{ width: W, height: H }}>
      <Posting lit={lit} active={phase === 'read'} />
      <Connectors phase={phase} />
      <Resume t={t} phase={phase} />
      <Letter t={t} phase={phase} />
    </div>
  )
}

// Phones: the finished result as one card, right under the buttons.
function CompactResult() {
  const b = EXAMPLE.bullets[0]
  return (
    <div className="relative mx-auto w-full max-w-[400px] pt-4">
      <div className="absolute inset-x-6 top-0 h-full rotate-[3deg] rounded-[18px] bg-[#FBF7EF] shadow-[0_16px_40px_-24px_rgba(30,27,75,0.3)] ring-1 ring-[rgba(120,90,40,0.12)]" />
      <div className="relative flex flex-col gap-3 rounded-[18px] bg-white p-5 shadow-[inset_0_3px_0_var(--brand),0_24px_60px_-28px_rgba(30,27,75,0.45)] ring-1 ring-[rgba(30,27,75,0.08)]">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-subtle">Your resume · {EXAMPLE.company}</span>
          <span className="flex shrink-0 items-baseline gap-1 rounded-full bg-brand-tint px-2.5 py-1 text-[11px] text-brand-ink">
            ATS match <span className="font-semibold">{EXAMPLE.score}</span>
          </span>
        </div>
        <p className="text-[12px] leading-[1.45] text-subtle line-through">{b.before}</p>
        <p className="-mt-1.5 text-[14px] leading-[1.5] text-body">{b.after[0]}<Hl className="font-medium">{b.after[1]}</Hl>{b.after[2]}</p>
        <div className="flex gap-2 border-t border-line pt-3 text-[12px] text-ink-2">
          {['Tailored resume', 'Cover letter'].map((s) => (
            <span key={s} className="flex items-center gap-1.5 rounded-[8px] bg-panel px-2.5 py-1.5">
              <CheckIcon size={12} weight="bold" className="text-brand-strong" />
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export function HeroStage() {
  const t = useLoopClock()
  return (
    <div data-hero-stage className="relative">
      <p className="sr-only">
        Example: Cover Me reads a {EXAMPLE.company} {EXAMPLE.role} posting, rewrites the resume in the posting&apos;s words, scores it
        {` ${EXAMPLE.score}`} out of 100, and writes a matching cover letter.
      </p>
      <div inert aria-hidden="true">
        <div className="mx-auto w-full max-w-[560px] max-lg:hidden">
          <FitScale width={W} height={H}>
            <Scene t={t} />
          </FitScale>
        </div>
        <div className="lg:hidden">
          <CompactResult />
        </div>
      </div>
    </div>
  )
}
