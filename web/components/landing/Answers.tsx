'use client'

import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import Image from 'next/image'
import { ArrowRightIcon, CheckIcon, XIcon } from '@phosphor-icons/react/dist/ssr'
import { cn } from '@/lib/utils'
import { PLAN_LIMITS as L } from '@/lib/limits'
import { Eyebrow } from '@/components/site/Eyebrow'
import { Ambient } from './Ambient'
import { BrowserFrame, EXAMPLE } from './visuals'
import { useReducedMotion } from './useScrollProgress'

// Answers to application questions (#232), as a loop: the cursor right-clicks
// the question box, picks "Cover Me: write an answer", the in-page box writes
// and types the answer, then asks for Shorter. Every piece is what the
// extension draws (content/answer-field.ts): its text, its chips, its dark
// palette. Nothing is submitted. It starts when it scrolls into view; reduced
// motion, and the server render, show the "Answer added" frame and stay there.
// The extension's "New" banner links here (#answers).

// Real output, not copy: the answer prompt (src/lib/ai/answer.ts) on Sonnet
// 5.5 at high effort, 2026-11-17, given a made-up Northwind posting built on
// EXAMPLE and an untailored Alex Rivera resume whose Brightline role has
// EXAMPLE's original bullets plus one on how the email and social work was
// done. SHORTER is the Shorter chip's change on that answer. Regenerate both
// if the prompt changes how answers read.
const QUESTION = 'Why do you want to work here?'
const MAX = 1000
const ANSWER =
  'I want to bring the email and paid social work I do on B2B software at Brightline to a scheduling product for independent clinics, and to lead the team that runs it. At Brightline I rebuilt the email nurture program into three tracks by customer segment and moved social spend to the two channels that converted best, with no added budget. Deciding which message reaches which customer and where the money goes is the work I want more of, and this role puts those decisions with me.'
const SHORTER =
  'At Brightline I rebuilt the email nurture program into three segment tracks and moved social spend to the two best-converting channels, with no added budget. Deciding who gets which message and where the money goes is the work I want more of, and this role puts those decisions with me.'
const CHANGES = ['Shorter', 'More specific', 'Another example']

type Phase = 'aim' | 'menu' | 'pick' | 'writing' | 'done' | 'chip' | 'rewriting' | 'revised'
// Milliseconds into the loop each phase starts.
const TIMELINE: [Phase, number][] = [
  ['aim', 0],
  ['menu', 1300],
  ['pick', 2300],
  ['writing', 3000],
  ['done', 4900],
  ['chip', 7600],
  ['rewriting', 8300],
  ['revised', 10000],
]
const LOOP = 14000

// Which of the four steps on the left the frame is showing.
// Before the answer is typed in, the box is empty and the status box is closed.
const BEFORE_ANSWER: Phase[] = ['aim', 'menu', 'pick']
const STEP: Record<Phase, number> = { aim: 0, menu: 0, pick: 1, writing: 2, done: 2, chip: 3, rewriting: 3, revised: 3 }
const STEPS: ReactNode[] = [
  'Right-click the question box.',
  <>Choose &ldquo;Cover Me: write an answer&rdquo;.</>,
  'Cover Me shows the question it read, writes an answer from your resume and the posting, and types it in.',
  'Ask for a change, or press Ctrl+Z to undo.',
]

const HONEST = [
  'Says so plainly when your resume lacks what the question asks about',
  'Never invents experience',
  'Leaves salary, start date and details only you know in [brackets] for you to fill in',
  'Never submits the form. You do',
]

export function Answers() {
  const reduced = useReducedMotion()
  const [phase, setPhase] = useState<Phase>('done')
  const stageRef = useRef<HTMLDivElement>(null)

  // Play while at least a third of the stage is on screen, from the start each time.
  useEffect(() => {
    const stage = stageRef.current
    if (reduced || !stage) {
      setPhase('done')
      return
    }
    let timers: number[] = []
    const stop = () => {
      timers.forEach(clearTimeout)
      timers = []
    }
    const play = () => {
      stop()
      TIMELINE.forEach(([p, at]) => timers.push(window.setTimeout(() => setPhase(p), at)))
      timers.push(window.setTimeout(play, LOOP))
    }
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? play() : stop()), { threshold: 0.35 })
    io.observe(stage)
    return () => {
      io.disconnect()
      stop()
    }
  }, [reduced])

  const step = STEP[phase]
  return (
    <section id="answers" className="container relative isolate scroll-mt-20 py-28 max-md:py-20">
      <Ambient
        glows={[{ left: -160, top: 40, size: 720, tone: 'brand' }]}
        shape={{ right: 10, bottom: 60, size: 110, rotate: 14 }}
      />
      <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,600px)]">
        <div className="flex flex-col gap-5">
          <Eyebrow>Application questions</Eyebrow>
          <h2 className="text-[clamp(32px,3.6vw,48px)] leading-[1.05]">Right-click a question. Get an answer from your resume.</h2>
          <p className="max-w-[460px] text-[17px] leading-[1.55] text-ink-2">
            Cover Me writes answers to the written questions on job applications and types them into the box, where you
            edit them before you apply.
          </p>
          <ol className="mt-2 flex max-w-[460px] flex-col gap-1">
            {STEPS.map((s, i) => (
              <li
                key={i}
                aria-current={!reduced && i === step ? 'step' : undefined}
                className={cn(
                  'flex gap-3 rounded-[14px] px-3 py-2.5 text-[15px] leading-[1.5] transition-colors duration-300',
                  !reduced && i === step ? 'bg-surface text-ink shadow-[0_8px_24px_-16px_rgba(30,27,75,0.35)]' : 'text-ink-2',
                )}
              >
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-[8px] text-[12px] font-semibold transition-colors duration-300',
                    !reduced && i === step ? 'bg-brand text-white' : 'bg-panel text-ink-2',
                  )}
                >
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>
        </div>

        <div ref={stageRef} className="stage-grid relative rounded-[28px] p-8 max-md:-mx-2 max-md:p-3">
          <p className="sr-only">
            On a {EXAMPLE.company} application, the question box &ldquo;{QUESTION}&rdquo; is right-clicked and Cover Me: write
            an answer is chosen. Cover Me types in: &ldquo;{ANSWER}&rdquo; Its box shows Answer added, the question it read,
            the job and the character limit, and the changes it offers.
          </p>
          <div inert aria-hidden="true">
            <Stage phase={phase} />
          </div>
        </div>
      </div>

      <ul className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {HONEST.map((h, i) => (
          <li key={i} className="soft-card flex items-start gap-2.5 p-5 text-[14.5px] leading-[1.5] text-body">
            <CheckIcon size={16} weight="bold" className="mt-[3px] shrink-0 text-brand-strong" />
            {h}
          </li>
        ))}
      </ul>
      <p className="mt-6 text-center text-[14px] text-subtle">
        Answers have their own allowance and never use up letters or resumes: {L.answer_starter} to start, then{' '}
        {L.answer_weekly} a week free, up to {L.answer_pro_daily} a day on Pro, unlimited with your own API key. Desktop Chrome
        only, since phones have no right-click menu.
      </p>
    </section>
  )
}

// The application page, the context menu and the in-page box.
function Stage({ phase }: { phase: Phase }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const itemRef = useRef<HTMLDivElement>(null)
  const chipRef = useRef<HTMLSpanElement>(null)
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)

  const answer = phase === 'revised' ? SHORTER : BEFORE_ANSWER.includes(phase) || phase === 'writing' ? '' : ANSWER
  const menuOpen = phase === 'menu' || phase === 'pick'
  const showCursor = phase === 'aim' || menuOpen || phase === 'chip'

  // Where the cursor points in this phase, measured from the drawn elements
  // so it lands on them at any width.
  // Between loops it waits, hidden, by the bottom corner, so each loop starts
  // with it moving in.
  useEffect(() => {
    const root = rootRef.current?.getBoundingClientRect()
    if (!root) return
    if (phase === 'done' || phase === 'revised') return setCursor({ x: root.width - 40, y: root.height - 30 })
    // While the box writes, the cursor fades where it clicked.
    if (phase === 'writing' || phase === 'rewriting') return
    const target = phase === 'pick' ? itemRef.current : phase === 'chip' ? chipRef.current : boxRef.current
    const r = target?.getBoundingClientRect()
    if (!r) return
    const x = phase === 'aim' || phase === 'menu' ? r.left + r.width * (window.innerWidth < 640 ? 0.18 : 0.42) : r.left + Math.min(r.width / 2, 48)
    const y = phase === 'aim' || phase === 'menu' ? r.top + 34 : r.top + r.height / 2
    setCursor({ x: x - root.left, y: y - root.top })
  }, [phase])

  return (
    <div ref={rootRef} className="relative">
      <BrowserFrame url={`job-boards.greenhouse.io/${EXAMPLE.company.toLowerCase()}/jobs/4821/apply`} className="shadow-[0_30px_70px_-30px_rgba(30,27,75,0.4)]">
        <div className="flex flex-col gap-3.5 p-6 pb-[270px] max-sm:p-4 max-sm:pb-[290px]">
          <div>
            <div className="text-[15px] font-semibold text-ink">Apply for {EXAMPLE.role}</div>
            <div className="text-[12px] text-subtle">{EXAMPLE.company} · Denver, CO</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" value={EXAMPLE.candidate.split(' ')[0]} />
            <Field label="Last name" value={EXAMPLE.candidate.split(' ')[1]} />
          </div>
          <div className="relative flex flex-col gap-1">
            <span className="text-[12px] font-medium text-ink-2">{QUESTION}</span>
            <div
              ref={boxRef}
              className={cn(
                'h-[152px] overflow-hidden rounded-[8px] border bg-white max-sm:h-[220px] px-3 py-2 text-[12.5px] leading-[1.5] text-body transition-colors',
                phase === 'aim' || menuOpen ? 'border-brand' : 'border-line',
              )}
            >
              <span key={answer} className={cn(answer && 'animate-[fadeIn_.25s_ease]')}>{answer}</span>
            </div>
            <span className="self-end text-[11px] tabular-nums text-subtle">{answer.length} / {MAX.toLocaleString('en-US')}</span>

            {menuOpen && <ContextMenu itemRef={itemRef} picked={phase === 'pick'} />}
            <StatusBox phase={phase} chipRef={chipRef} />
          </div>
        </div>
      </BrowserFrame>

      {cursor && (
        <svg
          className={cn('pointer-events-none absolute left-0 top-0 z-30 transition-[transform,opacity] duration-700 ease-in-out', showCursor ? 'opacity-100' : 'opacity-0')}
          style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }}
          width="20"
          height="20"
          viewBox="0 0 20 20"
        >
          <path d="M3 2l13 7.2-5.6 1.4L8 16z" fill="var(--ink)" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[12px] font-medium text-ink-2">{label}</span>
      <span className="rounded-[8px] border border-line bg-white px-3 py-1.5 text-[12.5px] text-body">{value}</span>
    </div>
  )
}

// Chrome's right-click menu on a text box, light theme, with the item Cover Me adds.
function ContextMenu({ itemRef, picked }: { itemRef: RefObject<HTMLDivElement | null>; picked: boolean }) {
  const plain = ['Undo', 'Cut', 'Copy', 'Paste', 'Select all']
  return (
    <div className="absolute left-[42%] top-[44px] z-20 w-[230px] animate-[fadeIn_.12s_ease] rounded-[8px] border border-line bg-white py-1.5 text-[12.5px] text-ink shadow-[0_8px_28px_-6px_rgba(30,27,75,0.3)] max-sm:left-[18%]">
      {plain.map((p, i) => (
        <div key={p} className={cn('px-3.5 py-[5px]', i === 0 && 'text-subtle')}>{p}</div>
      ))}
      <div className="my-1 border-t border-line" />
      <div ref={itemRef} className={cn('flex items-center gap-2 px-3.5 py-[5px] transition-colors', picked && 'bg-brand-tint')}>
        <Image src="/logo.png" width={14} height={14} alt="" className="rounded-[3px]" />
        Cover Me: write an answer
      </div>
    </div>
  )
}

// The in-page status box, as content/answer-field.ts draws it.
function StatusBox({ phase, chipRef }: { phase: Phase; chipRef: RefObject<HTMLSpanElement | null> }) {
  if (BEFORE_ANSWER.includes(phase)) return null
  const working = phase === 'writing' || phase === 'rewriting'
  const title = phase === 'writing' ? 'Writing your answer…' : phase === 'rewriting' ? 'Rewriting your answer…' : 'Answer added'
  const note = phase === 'rewriting' ? 'Change: Shorter' : working ? null : `${L.answer_starter - (phase === 'revised' ? 2 : 1)} of your first ${L.answer_starter} free answers left.`
  return (
    <div
      key={working ? 'working' : 'done'}
      className="absolute left-0 top-[calc(100%+6px)] z-10 w-[min(340px,100%)] animate-[fadeUp_.3s_ease] overflow-hidden rounded-[12px] border border-ext-border bg-ext-bg px-3.5 pb-3.5 pt-3 text-[12.5px] leading-[1.45] text-ext-text shadow-[0_1px_2px_rgba(21,19,43,.35),0_12px_32px_rgba(21,19,43,.32)]"
    >
      <div className="flex items-start gap-2.5">
        <Image src="/logo.png" width={18} height={18} alt="" className="mt-px shrink-0 rounded-[5px]" />
        <p className="flex-1 font-semibold">
          {title}
          {!working && <span className="ml-1.5 text-[11.5px] font-normal text-ext-muted">Ctrl+Z to undo</span>}
        </p>
        <XIcon size={12} className="mt-1 shrink-0 text-ext-muted" />
      </div>
      {note && <p className="ml-[28px] mt-1.5 text-ext-text-2">{note}</p>}
      <div className="ml-[28px] mt-2.5 border-t border-ext-elevated pt-2.5">
        <p className="line-clamp-3">&ldquo;{QUESTION}&rdquo;</p>
        <p className="mt-1 text-[11.5px] text-ext-muted">
          <span className="text-ext-soft">{EXAMPLE.role} · {EXAMPLE.company}</span> · {MAX.toLocaleString('en-US')} characters max
        </p>
      </div>
      {!working && (
        <>
          <div className="ml-[28px] mt-3 flex flex-wrap gap-1.5">
            {CHANGES.map((c) => (
              <span
                key={c}
                ref={c === 'Shorter' ? chipRef : undefined}
                className={cn(
                  'rounded-full border px-2.5 py-0.5 text-[11.5px] leading-[18px] text-ext-text-2 transition-colors',
                  c === 'Shorter' && phase === 'chip' ? 'border-ext-border-hover bg-ext-elevated text-ext-text' : 'border-ext-border bg-ext-surface',
                )}
              >
                {c}
              </span>
            ))}
          </div>
          <div className="ml-[28px] mt-2 flex items-center rounded-[8px] border border-ext-border bg-ext-surface">
            <span className="flex-1 px-2 py-1.5 text-ext-muted">Ask for a change…</span>
            <ArrowRightIcon size={12} className="mr-2 text-ext-muted opacity-60" />
          </div>
        </>
      )}
      {working && (
        <span className="absolute inset-x-0 bottom-0 h-[3px] overflow-hidden bg-ext-border">
          <span className="answers-bar absolute inset-y-0 left-0 w-[45%] rounded-[3px] bg-gradient-to-r from-brand to-ext-soft" />
        </span>
      )}
    </div>
  )
}
