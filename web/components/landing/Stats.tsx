'use client'

import { cn } from '@/lib/utils'
import { useCountUp } from './useCountUp'
import { Ambient } from './Ambient'

// Sourced numbers only. The last is ours: a typical tailoring run takes about
// 30 s; the 45 min manual figure is our estimate, and the source line says so.
const STATS: {
  value: number
  decimals: number
  suffix: string
  accent?: boolean
  label: string
  source: string
  href?: string
}[] = [
  {
    value: 2.1, decimals: 1, suffix: '×', accent: true,
    label: 'more interviews for tailored resumes',
    source: 'Huntr, 1.39M applications',
    href: 'https://huntr.co/research/job-search-trends-q2-2025',
  },
  {
    value: 97.8, decimals: 1, suffix: '%',
    label: 'of Fortune 500 companies screen with an ATS',
    source: 'Jobscan, 2025',
    href: 'https://www.jobscan.co/blog/fortune-500-use-applicant-tracking-systems/',
  },
  {
    value: 7.4, decimals: 1, suffix: 's',
    label: 'a recruiter spends on a first look',
    source: 'Ladders eye-tracking study',
    href: 'https://www.theladders.com/career-advice/you-only-get-6-seconds-of-fame-make-it-count',
  },
  {
    value: 30, decimals: 0, suffix: 's', accent: true,
    label: 'to tailor an application, vs about 45 minutes by hand',
    source: 'Typical Cover Me run; manual time is our estimate',
  },
]

function Stat({ stat, last }: { stat: (typeof STATS)[number]; last: boolean }) {
  const [ref, value] = useCountUp<HTMLDivElement>(stat.value, { decimals: stat.decimals })
  return (
    <div className={cn('flex flex-col gap-2.5 p-8 max-lg:border-b max-lg:border-[#EFEDEA]', !last && 'lg:border-r lg:border-[#EFEDEA]')}>
      <div ref={ref} className={cn('text-[56px] font-semibold leading-none tracking-[-0.04em]', stat.accent ? 'text-brand-strong' : 'text-ink')}>
        <span data-stat>{value}</span>
        {stat.suffix}
      </div>
      <div className="text-[15px] leading-[1.45] text-body">{stat.label}</div>
      {stat.href ? (
        <a href={stat.href} target="_blank" rel="noreferrer" className="mt-auto pt-2 text-[12px] text-subtle underline-offset-2 hover:underline">
          {stat.source}
        </a>
      ) : (
        <span className="mt-auto pt-2 text-[12px] text-subtle">{stat.source}</span>
      )}
    </div>
  )
}

export function Stats() {
  return (
    <section className="container relative isolate py-28 max-md:py-20">
      <Ambient glows={[{ left: -200, top: -60, size: 600, tone: 'warm' }]} dots={{ right: -40, top: 20, w: 380, h: 260 }} />
      <div className="flex items-end justify-between gap-10 max-lg:flex-col max-lg:items-start">
        <h2 className="max-w-[620px] text-[clamp(34px,4vw,52px)] leading-[1.05]">Why tailoring every application pays off</h2>
        <p className="max-w-[380px] text-[16px] leading-[1.55] text-ink-2">
          Tailored resumes get more interviews. Cover Me makes tailoring fast enough to do it every time.
        </p>
      </div>
      <div className="soft-card mt-10 grid lg:grid-cols-4">
        {STATS.map((s, i) => (
          <Stat key={s.label} stat={s} last={i === STATS.length - 1} />
        ))}
      </div>
    </section>
  )
}
