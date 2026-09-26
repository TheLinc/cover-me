import { Fragment } from 'react'
import { CheckIcon } from '@phosphor-icons/react/dist/ssr'
import { PatternNote } from '@/components/brand/PatternNote'
import { cn } from '@/lib/utils'

// Same example as the hero demo (78% match, 2 gaps). Keep the two in sync.
const KEYWORDS = [
  { label: 'React 5+ years', matched: true },
  { label: 'TypeScript', matched: true },
  { label: 'Large-scale apps', matched: true },
  { label: 'Performance optimization', matched: false },
  { label: 'CI/CD pipelines', matched: false },
]

const POINTS = [
  'See your ATS match percentage at a glance',
  "Pinpoint the exact keywords you're missing",
  'Understand which requirements you already meet',
  "Re-tailor in one click once you've closed the gaps",
]

export function AtsFit() {
  return (
    <section className="py-28 max-md:py-20">
      <div className="container grid grid-cols-[1fr_1.1fr] items-center gap-20 max-lg:grid-cols-1 max-lg:gap-14">
        <div className="reveal flex flex-col gap-6">
          <PatternNote>ATS scoring</PatternNote>
          <h2 className="text-[clamp(38px,5vw,68px)] italic leading-[0.95] text-ink">Made to measure.</h2>
          <p className="max-w-[500px] text-[16px] leading-[1.7] text-ink-2">
            After tailoring, Cover Me scores your resume against the specific role and surfaces the exact gaps — the skills, tools, and keywords the job demands that aren&apos;t yet reflected in your experience. No guessing what the recruiter&apos;s filter is looking for.
          </p>
          <ul className="flex flex-col gap-3">
            {POINTS.map((p) => (
              <li key={p} className="flex items-center gap-3 text-[14.5px] text-ink">
                <CheckIcon size={15} className="shrink-0 text-thread" />
                {p}
              </li>
            ))}
          </ul>
        </div>

        <figure className="reveal flex flex-col gap-8">
          <div className="relative">
            <div aria-hidden="true" className="piece absolute inset-y-0 left-0 w-[calc(50%-24px)]" />
            <div
              aria-hidden="true"
              className="piece absolute inset-y-0 right-0 w-[calc(50%-24px)]"
              style={{ borderColor: 'var(--chalk)' }}
            />
            <div className="relative grid grid-cols-[1fr_48px_1fr] gap-y-1 py-7">
              <PatternNote className="px-5 pb-3">Job posting</PatternNote>
              <span />
              <PatternNote className="px-5 pb-3 text-chalk">Your resume</PatternNote>
              {KEYWORDS.map((k) => (
                <Fragment key={k.label}>
                  <span className="px-5 py-2 text-[13.5px] text-ink">{k.label}</span>
                  <span
                    aria-hidden="true"
                    className={cn('self-center border-t-2', k.matched ? 'border-chalk' : 'border-dashed border-thread')}
                  />
                  <span
                    className={cn(
                      'px-5 py-2 font-mono text-[11.5px] uppercase tracking-[0.1em]',
                      k.matched ? 'text-chalk' : 'text-thread-deep',
                    )}
                  >
                    {k.matched ? 'Matched' : 'Gap'}
                  </span>
                </Fragment>
              ))}
            </div>
          </div>

          <div className="score-tape flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <PatternNote>ATS match · example</PatternNote>
              <span aria-hidden="true" className="score-num font-display text-[44px] leading-none text-ink" />
            </div>
            <div aria-hidden="true" className="h-10 overflow-hidden rounded-[2px] bg-tissue-2 ring-1 ring-line">
              <div className="score-fill tape h-full" />
            </div>
            <p className="sr-only">Example: the ATS match rises from 52% to 78% after tailoring, with 2 gaps left.</p>
          </div>
        </figure>
      </div>
    </section>
  )
}
