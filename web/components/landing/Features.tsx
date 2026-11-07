import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { LetterDoc } from './visuals'
import { Ambient } from './Ambient'

function HistoryRow({ label, date, faded }: { label: string; date: string; faded?: boolean }) {
  return (
    <div className={`flex items-center gap-3 rounded-[12px] bg-white px-4 py-3 text-[13px] ${faded ? 'opacity-60' : ''}`}>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-ink">{label}</div>
        <div className="text-[11px] text-subtle">{date}</div>
      </div>
      <span className="rounded-[6px] bg-brand-tint px-1.5 py-0.5 text-[10.5px] text-brand-ink">Letter</span>
      <span className="rounded-[6px] bg-brand-tint px-1.5 py-0.5 text-[10.5px] text-brand-ink">Resume</span>
    </div>
  )
}

// Real renders of a made-up resume (Alex Rivera): the Cover Me template from
// lib/pdf/resume.ts, and an own design exported from Word. Rendered with
// PyMuPDF at 640 px wide, so they're stale if the template changes.
function Page({ src, label }: { src: string; label: string }) {
  return (
    <div className="relative w-[46%] max-w-[360px]">
      <Badge variant="tint" className="absolute -top-8 left-0 text-[12px] max-md:-top-7 max-md:text-[11px]">{label}</Badge>
      <Image src={src} alt="" width={640} height={829} sizes="(min-width: 768px) 360px, 46vw" className="rounded-[4px] shadow-[0_18px_40px_-20px_rgba(30,27,75,0.35)]" />
    </div>
  )
}

const CARDS = [
  {
    title: 'Your design or ours',
    body: 'Upload a Word file to keep your own fonts and layout (beta), or use the ATS-ready Cover Me template. Both download as Word, and the template as PDF too.',
    wide: true,
    visual: (
      <div className="absolute inset-x-4 top-16 flex justify-center gap-[6%] max-md:top-12">
        <Page src="/landing/resume-own-design.png" label="Your design · Beta" />
        <Page src="/landing/resume-cover-me-template.png" label="Cover Me template" />
      </div>
    ),
  },
  {
    title: 'A cover letter written from your resume',
    body: 'Specific to the job, editable in place, no clichés.',
    visual: <LetterDoc className="absolute inset-x-9 top-9 -bottom-5" />,
  },
  {
    title: 'Every application in one history',
    body: 'With an account, every job you generate for lands on a board on your dashboard. Pro keeps the letters and resumes there too.',
    visual: (
      <div className="flex h-full flex-col justify-center gap-2.5 p-7">
        <HistoryRow label="Northwind · Marketing Manager" date="Today" />
        <HistoryRow label="Acme · Operations Lead" date="Yesterday" />
        <HistoryRow label="Globex · Project Coordinator" date="Oct 2" faded />
      </div>
    ),
  },
]

export function Features() {
  return (
    <section className="container relative isolate py-28 max-md:py-20">
      <Ambient
        glows={[{ left: -220, bottom: -80, size: 680, tone: 'brand' }]}
        dots={{ right: 0, top: 30, w: 340, h: 200 }}
      />
      <h2 className="max-w-[700px] text-[clamp(34px,4vw,52px)] leading-[1.05]">Everything you need to apply, in one popup</h2>
      <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
        {CARDS.map((c) => (
          <div key={c.title} className={`reveal flex flex-col gap-4 ${'wide' in c ? 'md:col-span-2' : ''}`}>
            <div inert aria-hidden="true" className={`relative overflow-hidden rounded-[24px] bg-panel ${'wide' in c ? 'h-[440px] max-md:h-[280px]' : 'h-[300px]'}`}>
              {c.visual}
            </div>
            <h3 className="text-[18px] font-semibold tracking-[-0.01em]">{c.title}</h3>
            <p className="-mt-2 text-[15px] leading-[1.55] text-ink-2">{c.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
