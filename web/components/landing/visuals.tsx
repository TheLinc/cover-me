import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// Example data for every product visual on the landing page. Names are
// placeholders, numbers are an illustrative example (labelled as such where a
// score appears). Keep it a role most job seekers recognise, not a tech job.
export const EXAMPLE = {
  company: 'Northwind',
  role: 'Marketing Manager',
  keywords: ['SEO', 'Campaign strategy', 'Google Analytics', 'Budget management', 'Team leadership', 'HubSpot'],
  gaps: ['HubSpot'],
  matchedLines: ['SEO, Campaign strategy, Google Analytics', 'Budget management, Team leadership'],
  extraGap: 'Salesforce',
  letterOpening:
    'Your posting asks for someone who can grow demand without growing the budget. At Brightline I grew qualified leads 38% on a flat spend…',
  bulletBefore: 'Handled social media and email marketing',
  bulletAfter: 'Ran email and social campaigns that grew qualified leads 38%',
  // Cover Me scores only the tailored resume. `before` appears only in the
  // ATS section's illustrative before/after card, never in the popup visuals.
  before: 54,
  score: 86,
}

export function Line({ w, className }: { w: string; className?: string }) {
  return <div className={cn('h-[7px] rounded-full bg-[#EFEDEA]', className)} style={{ width: w }} />
}

export function Chip({ children, gap }: { children: ReactNode; gap?: boolean }) {
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-1 text-[12px]',
        gap ? 'bg-gap-tint text-gap-ink' : 'bg-brand-tint text-brand-ink',
      )}
    >
      {children}
    </span>
  )
}

function Label({ children }: { children: ReactNode }) {
  return <div className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-subtle">{children}</div>
}

export function JobCard({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3.5 rounded-[20px] bg-white p-5 shadow-[0_20px_50px_-24px_rgba(30,27,75,0.25)]', className)}>
      <Label>Job posting</Label>
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-[10px] bg-ink font-semibold text-white">N</div>
        <div>
          <div className="text-[15px] font-semibold text-ink">{EXAMPLE.role}</div>
          <div className="text-[12.5px] text-subtle">{EXAMPLE.company} · Remote</div>
        </div>
      </div>
      <div className="h-px bg-[#EFEDEA]" />
      <div className="text-[12px] font-semibold text-ink-2">What you&apos;ll need</div>
      <div className="flex flex-wrap gap-1.5">
        {EXAMPLE.keywords.map((k) => (
          <Chip key={k}>{k}</Chip>
        ))}
      </div>
      <div className="mt-1 flex flex-col gap-2">
        <Line w="100%" />
        <Line w="86%" />
        <Line w="64%" />
      </div>
    </div>
  )
}

function Hl({ children }: { children: ReactNode }) {
  return <span className="rounded bg-brand-tint px-1 text-brand-ink">{children}</span>
}

export function ResumeDoc({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2.5 rounded-[16px] bg-white p-6 shadow-[0_24px_60px_-24px_rgba(30,27,75,0.35)]', className)}>
      <div className="flex items-center justify-between">
        <Label>Your resume</Label>
        <span className="rounded-full bg-brand-tint px-2.5 py-1 text-[11px] text-brand-ink">Tailored for {EXAMPLE.company}</span>
      </div>
      <div className="text-[16px] font-semibold text-ink">Alex Rivera</div>
      <Line w="55%" />
      <div className="mt-2 text-[11px] font-semibold text-ink-2">Experience</div>
      <p className="text-[12px] leading-[1.55] text-body">Led a <Hl>campaign strategy</Hl> refresh that grew qualified leads 38%</p>
      <p className="text-[12px] leading-[1.55] text-body">Owned a $1.2M paid media <Hl>budget</Hl> across four channels</p>
      <p className="text-[12px] leading-[1.55] text-body">Grew organic traffic 64% with an <Hl>SEO</Hl> content program</p>
      <div className="mt-1 flex flex-col gap-2">
        <Line w="92%" />
        <Line w="76%" />
      </div>
    </div>
  )
}

export function LetterDoc({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2.5 rounded-[16px] bg-white p-6 shadow-[0_24px_60px_-24px_rgba(30,27,75,0.35)]', className)}>
      <Label>Cover letter</Label>
      <div className="text-[13px] font-semibold text-ink">Dear {EXAMPLE.company} team,</div>
      <p className="text-[12px] leading-[1.6] text-body">
        {EXAMPLE.letterOpening}
      </p>
      <div className="flex flex-col gap-2">
        <Line w="96%" />
        <Line w="88%" />
        <Line w="70%" />
      </div>
    </div>
  )
}

// The page clips its content, not the frame, so toolbar effects (the click
// burst on the extension icon) can spill past the window edge.
export function BrowserFrame({
  url,
  toolbar,
  children,
  className,
}: {
  url: string
  toolbar?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col rounded-[16px] bg-white shadow-[0_20px_50px_-24px_rgba(30,27,75,0.25)]', className)}>
      <div className="relative z-20 flex h-9 items-center gap-1.5 rounded-t-[16px] bg-[#F2F0ED] px-3.5">
        <span className="size-2.5 rounded-full bg-[#E0DCD7]" />
        <span className="size-2.5 rounded-full bg-[#E0DCD7]" />
        <span className="size-2.5 rounded-full bg-[#E0DCD7]" />
        <div className="ml-3 flex h-5 flex-1 items-center truncate rounded-full bg-white px-2.5 text-[11px] text-subtle">{url}</div>
        {toolbar}
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-b-[16px]">{children}</div>
    </div>
  )
}
