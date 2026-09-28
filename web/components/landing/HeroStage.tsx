'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { ExtensionPopup, PopupButton } from './ExtensionPopup'
import { ScoreRing } from './ScoreRing'
import { Chip, EXAMPLE, JobCard, LetterDoc, ResumeDoc } from './visuals'

const SCENES = [
  { id: 'resume', label: 'Tailor resume' },
  { id: 'letter', label: 'Write cover letter' },
  { id: 'score', label: 'Check ATS score' },
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
          Dear {EXAMPLE.company} team, your posting asks for someone who can make a large React codebase fast…
        </p>
        <div className="skeleton-line h-2 w-[92%]" />
        <div className="skeleton-line h-2 w-[80%]" />
        <div className="skeleton-line h-2 w-[64%]" />
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center gap-2 px-4 pb-3 pt-5">
      <ScoreRing from={EXAMPLE.before} to={EXAMPLE.after} />
      <div className="text-[12px] text-ext-soft">+{EXAMPLE.after - EXAMPLE.before} points after tailoring</div>
      <div className="mt-2 flex w-full flex-col gap-2 text-[12px]">
        <span className="text-ext-soft">✓ React, TypeScript, Performance</span>
        <span className="text-ext-soft">✓ Design systems, Accessibility</span>
        <span className="text-[#FDBA74]">! CI/CD: not in your experience</span>
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
        Example: Cover Me reads a job posting, raises the resume&apos;s ATS match from {EXAMPLE.before}% to {EXAMPLE.after}%,
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
        <div key={`out-${scene}`} className={cn('hidden items-center justify-center animate-[fadeUp_.5s_ease] lg:flex', OUTPUT_H)}>
          <Output scene={scene} />
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Product demo"
        className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-1 rounded-full bg-white/90 p-1.5 shadow-[0_8px_24px_-12px_rgba(30,27,75,0.3)] backdrop-blur"
      >
        {SCENES.map((s) => (
          <button
            key={s.id}
            role="tab"
            aria-selected={scene === s.id}
            onClick={() => {
              setScene(s.id)
              setAuto(false)
            }}
            className={cn(
              'whitespace-nowrap rounded-full px-4 py-2 text-[13px] transition-colors max-sm:px-3 max-sm:text-[12px]',
              scene === s.id ? 'bg-ink text-white' : 'text-ink-2 hover:text-ink',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}
