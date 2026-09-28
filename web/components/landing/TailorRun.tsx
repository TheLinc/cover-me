'use client'

import { cn } from '@/lib/utils'
import { ExtensionPopup, PopupButton } from './ExtensionPopup'
import { FitScale } from './FitScale'
import { useCountUp } from './useCountUp'
import { EXAMPLE, LetterDoc, ResumeDoc } from './visuals'

// A real tailoring run takes about 30 s; this replays one in a few seconds
// (the caption says so). The server renders the finished state.
const RUN_SECONDS = 28
const STEPS = [
  { at: 0, label: 'Read the posting' },
  { at: 4, label: 'Rewrite summary' },
  { at: 10, label: 'Rewrite experience' },
  { at: 22, label: 'Match skills' },
]

function stepState(i: number, t: number) {
  const next = STEPS[i + 1]?.at ?? RUN_SECONDS
  if (t >= next) return 'done'
  if (t >= STEPS[i].at) return 'active'
  return 'todo'
}

function Run() {
  const [ref, value] = useCountUp<HTMLDivElement>(RUN_SECONDS, { duration: 5200 })
  const t = Number(value)
  const done = t >= RUN_SECONDS
  const role = Math.min(3, 1 + Math.floor((t - 10) / 4))
  return (
    <div ref={ref} className="relative h-full w-full">
      <LetterDoc className="absolute left-0 top-6 w-[250px] -rotate-[7deg] opacity-95" />
      <ResumeDoc className="absolute right-0 top-0 w-[270px] rotate-[6deg]" />
      <ExtensionPopup
        status={done ? `Done in 0:${RUN_SECONDS}` : 'Tailoring…'}
        className="absolute bottom-0 left-1/2 w-[300px] -translate-x-1/2"
        footer={
          <>
            <PopupButton primary>Download resume</PopupButton>
            <PopupButton>Cover letter</PopupButton>
          </>
        }
      >
        <div className="flex flex-col gap-3 px-4 py-4">
          <div className="flex items-baseline justify-between">
            <span className="text-[12px] text-ext-muted">{done ? 'Resume tailored' : 'Tailoring your resume'}</span>
            <span className="font-mono text-[15px] tabular-nums">0:{String(Math.round(t)).padStart(2, '0')}</span>
          </div>
          <div className="h-1.5 rounded-full bg-ext-elevated">
            <div className="h-1.5 rounded-full bg-brand" style={{ width: `${(t / RUN_SECONDS) * 100}%` }} />
          </div>
          <ul className="flex flex-col gap-1.5 text-[12px]">
            {STEPS.map((s, i) => {
              const state = stepState(i, t)
              return (
                <li
                  key={s.label}
                  className={cn(
                    state === 'done' && 'text-ext-soft',
                    state === 'active' && 'pulse text-ext-text',
                    state === 'todo' && 'text-ext-muted',
                  )}
                >
                  {state === 'done' ? '✓' : '○'} {s.label}
                  {s.label === 'Rewrite experience' && state === 'active' ? ` (${role} of 3)` : ''}
                </li>
              )
            })}
          </ul>
          <div className="flex items-center justify-between rounded-[10px] bg-ext-elevated px-3 py-2 text-[12px]">
            <span className="text-ext-muted">ATS match</span>
            <span className={done ? 'font-semibold text-ext-text' : 'text-ext-muted'}>
              {done ? `${EXAMPLE.score}%` : 'Scoring…'}
            </span>
          </div>
        </div>
      </ExtensionPopup>
    </div>
  )
}

export function TailorRun() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div inert aria-hidden="true" className="w-full">
        <FitScale width={480} height={440}>
          <Run />
        </FitScale>
      </div>
      <p className="text-balance text-center font-mono text-[11px] text-subtle">Shown sped up. A real run takes about 30 seconds.</p>
    </div>
  )
}
