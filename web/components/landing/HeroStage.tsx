'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { ExtensionPopup, PopupButton } from './ExtensionPopup'
import { ScoreRing } from './ScoreRing'
import { Chip, EXAMPLE, JobCard, LetterDoc, ResumeDoc } from './visuals'

// `short` labels keep the tab bar inside a phone-width stage.
const SCENES = [
  { id: 'resume', label: 'Tailor resume', short: 'Resume' },
  { id: 'letter', label: 'Write cover letter', short: 'Letter' },
  { id: 'score', label: 'ATS match', short: 'ATS match' },
] as const
type SceneId = (typeof SCENES)[number]['id']

// Animated connector between stage columns (desktop only).
function Flow() {
  return (
    <svg viewBox="0 0 48 40" className="hidden h-10 w-12 self-center lg:block" aria-hidden="true">
      <path className="flow-line" d="M0 20 H48" fill="none" stroke="var(--brand)" strokeWidth="2" />
      <circle cx="3" cy="20" r="3.5" fill="var(--brand)" />
      <circle cx="45" cy="20" r="3.5" fill="var(--brand)" />
    </svg>
  )
}

// Fixed heights so switching scenes swaps content without resizing the stage.
const POPUP_BODY_H = 'h-[300px]'
const OUTPUT_H = 'lg:h-[370px]'

function PopupBody({ scene }: { scene: SceneId }) {
  return (
    <div className={cn(POPUP_BODY_H, 'overflow-hidden')}>
      <PopupScene scene={scene} />
    </div>
  )
}

function PopupScene({ scene }: { scene: SceneId }) {
  if (scene === 'letter') {
    return (
      <div className="flex flex-col gap-3 px-4 py-5">
        <div className="text-[12px] text-ext-muted">Cover letter · {EXAMPLE.company}</div>
        <p className="text-[12.5px] leading-[1.6]">
          Dear {EXAMPLE.company} team, {EXAMPLE.letterOpening.charAt(0).toLowerCase() + EXAMPLE.letterOpening.slice(1)}
        </p>
        <div className="skeleton-line h-2 w-[92%]" />
        <div className="skeleton-line h-2 w-[80%]" />
        <div className="skeleton-line h-2 w-[64%]" />
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center gap-2 px-4 pb-3 pt-5">
      <ScoreRing to={EXAMPLE.score} />
      <div className="text-[12px] text-ext-soft">Tailored resume vs. {EXAMPLE.company} posting</div>
      <div className="mt-2 flex w-full flex-col gap-2 text-[12px]">
        {EXAMPLE.matchedLines.map((l) => (
          <span key={l} className="text-ext-soft">✓ {l}</span>
        ))}
        <span className="text-[#FDBA74]">! {EXAMPLE.gaps[0]}: not in your experience</span>
      </div>
    </div>
  )
}

function Output({ scene }: { scene: SceneId }) {
  if (scene === 'letter') return <LetterDoc className="w-full max-w-[330px]" />
  if (scene === 'score') {
    return (
      <div className="flex w-full max-w-[330px] flex-col gap-4 rounded-[16px] bg-white p-6 shadow-[0_24px_60px_-24px_rgba(30,27,75,0.35)]">
        <div className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-subtle">Keywords from the posting</div>
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLE.keywords.map((k) => (
            <Chip key={k} gap={EXAMPLE.gaps.includes(k)}>
              {EXAMPLE.gaps.includes(k) ? k : `✓ ${k}`}
            </Chip>
          ))}
        </div>
        <div className="flex gap-4 text-[12px] text-subtle">
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-brand" />In your resume</span>
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-gap" />Gap</span>
        </div>
      </div>
    )
  }
  return <ResumeDoc className="w-full max-w-[330px]" />
}

// Tab bar with one dark pill that slides and resizes to the selected tab.
// Tabs differ in width (and switch to short labels on phones), so the pill is
// measured from the selected button and re-measured when the bar resizes.
function SceneTabs({ scene, onPick }: { scene: SceneId; onPick: (id: SceneId) => void }) {
  const listRef = useRef<HTMLDivElement>(null)
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null)

  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return
    const measure = () => {
      const el = list.querySelector<HTMLElement>('[aria-selected="true"]')
      if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(list)
    return () => ro.disconnect()
  }, [scene])

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label="Product demo"
      className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-1 rounded-full bg-white/90 p-1.5 shadow-[0_8px_24px_-12px_rgba(30,27,75,0.3)] backdrop-blur"
    >
      {pill && (
        <span
          aria-hidden="true"
          className="absolute inset-y-1.5 left-0 rounded-full bg-ink transition-[transform,width] duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)]"
          style={{ width: pill.width, transform: `translateX(${pill.left}px)` }}
        />
      )}
      {SCENES.map((s) => (
        <button
          key={s.id}
          role="tab"
          aria-selected={scene === s.id}
          onClick={() => onPick(s.id)}
          className={cn(
            'relative z-10 whitespace-nowrap rounded-full px-4 py-2 text-[13px] transition-colors duration-300 max-sm:px-3 max-sm:text-[12px]',
            scene === s.id ? 'text-white' : 'text-ink-2 hover:text-ink',
            // Before the pill is measured (first paint), the selected tab carries its own fill.
            !pill && scene === s.id && 'bg-ink',
          )}
        >
          <span className="sm:hidden">{s.short}</span>
          <span className="max-sm:hidden">{s.label}</span>
        </button>
      ))}
    </div>
  )
}

export function HeroStage() {
  const [scene, setScene] = useState<SceneId>('resume')
  const [auto, setAuto] = useState(true)

  // Cycle scenes like a product demo until the visitor picks one.
  useEffect(() => {
    if (!auto || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => {
      setScene((s) => SCENES[(SCENES.findIndex((x) => x.id === s) + 1) % SCENES.length].id)
    }, 6000)
    return () => clearInterval(id)
  }, [auto])

  return (
    <div data-hero-stage className="stage-grid relative overflow-hidden rounded-[32px] px-6 pb-24 pt-10 lg:px-12 lg:pt-14">
      <p className="sr-only">
        Example: Cover Me reads a job posting, tailors the resume to it, scores the tailored resume at a {EXAMPLE.score}% ATS match,
        and writes a matching cover letter.
      </p>
      <div
        inert
        aria-hidden="true"
        className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_48px_290px_48px_minmax(0,1fr)] lg:gap-0"
      >
        <JobCard className="hidden lg:flex" />
        <Flow />
        <ExtensionPopup
          key={scene}
          status={scene === 'letter' ? 'Letter ready' : 'Resume tailored'}
          className="mx-auto w-full max-w-[290px] animate-[fadeIn_.4s_ease]"
          footer={
            <>
              <PopupButton primary>{scene === 'letter' ? 'Copy letter' : 'Download resume'}</PopupButton>
              <PopupButton>{scene === 'letter' ? 'PDF' : 'Cover letter'}</PopupButton>
            </>
          }
        >
          <PopupBody scene={scene} />
        </ExtensionPopup>
        <Flow />
        <div key={`out-${scene}`} className={cn('hidden items-center justify-start animate-[fadeUp_.5s_ease] lg:flex', OUTPUT_H)}>
          <Output scene={scene} />
        </div>
      </div>

      <SceneTabs
        scene={scene}
        onPick={(id) => {
          setScene(id)
          setAuto(false)
        }}
      />
    </div>
  )
}
