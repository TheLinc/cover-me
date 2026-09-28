'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Eyebrow } from '@/components/site/Eyebrow'
import { ExtensionPopup, PopupButton } from './ExtensionPopup'
import { FitScale } from './FitScale'
import { BrowserFrame, Chip, EXAMPLE, LetterDoc, Line, ResumeDoc } from './visuals'

const STEPS = [
  {
    title: 'Open any job posting',
    body: 'LinkedIn, Indeed, Greenhouse, Lever, Workday and more are read automatically. Anywhere else, paste the description.',
  },
  {
    title: 'Click Tailor resume',
    body: "Cover Me pulls the posting's keywords and rewrites your summary, bullets and skills to match. It never invents experience.",
  },
  {
    title: 'Download and apply',
    body: 'A one-page PDF and a cover letter written from your resume. Edit either before you send.',
  },
]

// The step visuals are laid out at the desktop panel's size and scaled down as a
// whole on small screens (FitScale) instead of reflowing into a squeeze.
const VISUAL_W = 504
const VISUAL_H = 496

function PostingPage({ children }: { children?: React.ReactNode }) {
  return (
    <BrowserFrame url={`job-boards.greenhouse.io/northwind/jobs/4821`} className="h-full">
      <div className="flex flex-col gap-3 p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-[10px] bg-ink font-semibold text-white">N</div>
          <div>
            <div className="text-[17px] font-semibold text-ink">{EXAMPLE.role}</div>
            <div className="text-[12px] text-subtle">{EXAMPLE.company} · Remote · Full time</div>
          </div>
        </div>
        <div className="mt-3 text-[12px] font-semibold text-ink-2">About the role</div>
        <Line w="96%" />
        <Line w="88%" />
        <Line w="92%" />
        <Line w="60%" />
        <div className="mt-3 text-[12px] font-semibold text-ink-2">Requirements</div>
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLE.keywords.map((k) => (
            <Chip key={k}>{k}</Chip>
          ))}
        </div>
        <Line w="84%" className="mt-2" />
        <Line w="72%" />
        <Line w="90%" />
      </div>
      {children}
    </BrowserFrame>
  )
}

function StepVisual({ step }: { step: number }) {
  if (step === 0) {
    return (
      <PostingPage>
        <div className="absolute bottom-5 right-5 flex items-center gap-2 rounded-full bg-brand-tint px-3 py-1.5 text-[12px] font-medium text-brand-ink">
          <span className="pulse size-2 rounded-full bg-brand" />
          Posting detected · Greenhouse
        </div>
      </PostingPage>
    )
  }
  if (step === 1) {
    return (
      <PostingPage>
        <ExtensionPopup className="absolute right-4 top-4 w-[250px]">
          <div className="flex flex-col gap-3 px-4 py-4">
            <div className="text-[12px] text-ext-muted">Tailoring your resume</div>
            <div className="pulse text-[14px] font-medium">Rewriting experience (2 of 3)</div>
            <div className="h-1.5 rounded-full bg-ext-elevated">
              <div className="h-1.5 w-[62%] rounded-full bg-brand" />
            </div>
            <div className="flex flex-col gap-1.5 text-[11.5px] text-ext-muted">
              <span className="text-ext-soft">✓ Read the posting · 14 keywords</span>
              <span className="text-ext-soft">✓ Rewrote summary</span>
              <span>○ Skills</span>
            </div>
          </div>
        </ExtensionPopup>
      </PostingPage>
    )
  }
  return (
    <div className="relative flex h-full items-center justify-center">
      <LetterDoc className="absolute left-[8%] top-[14%] w-[62%] rotate-[-4deg]" />
      <ResumeDoc className="relative z-10 ml-[20%] w-[64%]" />
      <div className="absolute bottom-[8%] right-[8%] z-20 w-[200px]">
        <ExtensionPopup footer={<><PopupButton primary>Download PDF</PopupButton><PopupButton>Copy</PopupButton></>}>
          <div className="px-4 py-3 text-[12px] text-ext-muted">Ready to apply</div>
        </ExtensionPopup>
      </div>
    </div>
  )
}

export function HowItWorks() {
  const [active, setActive] = useState(0)
  const refs = useRef<(HTMLDivElement | null)[]>([])

  // The step nearest the middle of the viewport drives the sticky visual.
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.step))
      },
      { rootMargin: '-45% 0px -45% 0px' },
    )
    refs.current.forEach((el) => el && obs.observe(el))
    return () => obs.disconnect()
  }, [])

  return (
    <section id="how-it-works" className="container py-28 max-md:py-20">
      <div className="grid gap-16 lg:grid-cols-2">
        <div className="min-w-0">
          <div className="flex flex-col gap-4">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="text-[clamp(34px,4vw,52px)] leading-[1.05]">From job posting to application in three clicks</h2>
          </div>
          <div className="mt-10 flex flex-col">
            {STEPS.map((s, i) => (
              <div
                key={s.title}
                ref={(el) => { refs.current[i] = el }}
                data-step={i}
                className="flex flex-col gap-4 border-t border-line py-8 lg:min-h-[40vh] lg:justify-center"
              >
                <div className="flex items-baseline gap-4">
                  <span className={cn('font-mono text-[13px]', active === i ? 'text-brand-strong' : 'text-subtle')}>0{i + 1}</span>
                  <h3 className={cn('text-[22px] font-medium tracking-[-0.02em] transition-colors', active === i ? 'text-ink' : 'text-subtle')}>
                    {s.title}
                  </h3>
                </div>
                <p className="max-w-[440px] pl-9 text-[16px] leading-[1.6] text-ink-2">{s.body}</p>
                <div inert aria-hidden="true" className="stage-grid mt-4 rounded-[24px] p-4 lg:hidden">
                  <FitScale width={VISUAL_W} height={VISUAL_H}>
                    <StepVisual step={i} />
                  </FitScale>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="hidden lg:block">
          <div inert aria-hidden="true" className="stage-grid sticky top-28 h-[560px] rounded-[28px] p-8">
            <div key={active} className="h-full animate-[fadeIn_.45s_ease]">
              <StepVisual step={active} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
