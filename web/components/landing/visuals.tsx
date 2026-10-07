import type { CSSProperties, ReactNode } from 'react'
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
  candidate: 'Alex Rivera',
  // The posting's requirements, split the way the tailor prompt tiers them.
  // With the real 70/30 weights and HubSpot missing they score
  // 4/5 × 70 + 3/3 × 30 = 86 (SCORE below computes it).
  mustHave: ['SEO', 'Campaign strategy', 'Google Analytics', 'Budget management', 'HubSpot'],
  niceToHave: ['Team leadership', 'A/B testing', 'Copywriting'],
  // Posting body: strings, or { k } where a requirement appears (`text` when
  // the words on the page differ from the requirement's name).
  posting: [
    ["You'll own our ", { k: 'Campaign strategy', text: 'campaign strategy' }, ' across email and social, manage a $1.2M ', { k: 'Budget management', text: 'budget' }, ' and report results in ', { k: 'Google Analytics' }, '.'],
    ['You bring strong ', { k: 'SEO' }, ' skills, hands-on ', { k: 'HubSpot' }, ' experience and a record of ', { k: 'Team leadership', text: 'team leadership' }, '. ', { k: 'A/B testing' }, ' and ', { k: 'Copywriting', text: 'copywriting' }, ' are a plus.'],
  ] as PostingLine[],
  // Every rewrite keeps the facts and only borrows the posting's words.
  bullets: [
    { before: 'Handled social media and email marketing that grew leads 38%', after: ['Owned ', 'campaign strategy', ' for email and social, growing qualified leads 38%'] },
    { before: 'Managed $1.2M in paid media spend across four channels', after: ['Owned a $1.2M paid media ', 'budget', ' across four channels'] },
    { before: 'Wrote blog posts that grew organic traffic 64%', after: ['Grew organic traffic 64% with an ', 'SEO', ' content program'] },
  ] as { before: string; after: [string, string, string] }[],
  skillsBefore: 'Analytics, copy, testing, managed a team of 4',
  skillsAfter: ['Google Analytics', 'A/B testing', 'Copywriting', 'Team leadership'],
  letterOpening:
    'Your posting asks for someone who can grow demand without growing the budget. At Brightline I grew qualified leads 38% on a flat spend…',
  letter: [
    'Your posting asks for someone who can grow demand without growing the budget. At Brightline I grew qualified leads 38% on a flat spend by rebuilding our campaign strategy around email and social.',
    'I also own a $1.2M paid media budget across four channels, and the SEO program I started lifted organic traffic 64%.',
  ],
  // Cover Me scores only the tailored resume, so no visual shows a before score.
  score: 86,
}

export type PostingLine = (string | { k: string; text?: string })[]

// Same weights as scoreFromMatch in backend/supabase/functions/tailor: the
// posting's must-haves share 70 points, its nice-to-haves share 30.
export const TIERS = [
  { label: 'Must-have', points: 70, keywords: EXAMPLE.mustHave },
  { label: 'Nice to have', points: 30, keywords: EXAMPLE.niceToHave },
]
export const CELLS = TIERS.flatMap((t) =>
  t.keywords.map((k) => ({ k, pts: t.points / t.keywords.length, gap: EXAMPLE.gaps.includes(k) })),
)
export const SCORE = Math.round(CELLS.reduce((sum, c) => sum + (c.gap ? 0 : c.pts), 0))

export function Line({ w, className }: { w: string; className?: string }) {
  return <div className={cn('h-[7px] rounded-full bg-[#EFEDEA]', className)} style={{ width: w }} />
}

export function Label({ children }: { children: ReactNode }) {
  return <div className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-subtle">{children}</div>
}

export function Hl({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('rounded bg-brand-tint px-1 text-brand-ink', className)}>{children}</span>
}

export function ResumeDoc({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div style={style} className={cn('flex flex-col gap-2.5 rounded-[16px] bg-white p-6 shadow-[0_24px_60px_-24px_rgba(30,27,75,0.35)]', className)}>
      <div className="flex items-center justify-between">
        <Label>Your resume</Label>
        <span className="rounded-full bg-brand-tint px-2.5 py-1 text-[11px] text-brand-ink">Tailored for {EXAMPLE.company}</span>
      </div>
      <div className="text-[16px] font-semibold text-ink">{EXAMPLE.candidate}</div>
      <Line w="55%" />
      <div className="mt-2 text-[11px] font-semibold text-ink-2">Experience</div>
      {EXAMPLE.bullets.map(({ after: [a, k, b] }) => (
        <p key={k} className="text-[12px] leading-[1.55] text-body">{a}<Hl>{k}</Hl>{b}</p>
      ))}
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
