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

// The downloaded resume: the extension's Times-serif PDF template, in miniature.
function PdfPage() {
  const rule = <div className="mt-1.5 h-px bg-ink/80" />
  return (
    <div className="flex h-[236px] w-[176px] rotate-[-3deg] flex-col rounded-[6px] bg-white px-4 py-4 font-serif shadow-[0_18px_40px_-20px_rgba(30,27,75,0.35)]">
      <div className="text-center text-[11px] font-bold tracking-[0.04em] text-ink">ALEX RIVERA</div>
      <div className="text-center text-[5.5px] text-subtle">alex@example.com · Chicago, IL</div>
      <div className="mt-2.5 text-[6.5px] font-bold uppercase tracking-[0.08em] text-ink">Experience</div>
      {rule}
      <div className="mt-1 flex justify-between text-[6px] font-bold text-ink"><span>Brightline</span><span>2021 – now</span></div>
      {['campaign strategy', 'budget', 'SEO'].map((k) => (
        <div key={k} className="mt-1 flex gap-1 text-[5.5px] leading-[1.4] text-body">
          <span>•</span>
          <span>… <span className="rounded-[1px] bg-brand-tint text-brand-ink">{k}</span> …</span>
        </div>
      ))}
      <div className="mt-2.5 text-[6.5px] font-bold uppercase tracking-[0.08em] text-ink">Skills</div>
      {rule}
      <div className="mt-1 text-[5.5px] text-body">Google Analytics · A/B testing · Copywriting · Team leadership</div>
      <span className="mt-auto self-end rounded-full bg-brand-tint px-2 py-0.5 font-sans text-[9px] text-brand-ink">1 page · PDF</span>
    </div>
  )
}

const CARDS = [
  {
    title: 'A cover letter written from your resume',
    body: 'Specific to the job, editable in place, no clichés.',
    visual: <LetterDoc className="absolute inset-x-9 top-9 -bottom-5" />,
  },
  {
    title: 'A clean one-page PDF, ready to upload',
    body: 'ATS-friendly layout. Compact mode trims it to one page.',
    visual: (
      <div className="flex h-full items-center justify-center">
        <PdfPage />
      </div>
    ),
  },
  {
    title: 'Every application in one history',
    body: 'Reopen any letter or resume. Pro syncs it across devices.',
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
      <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {CARDS.map((c) => (
          <div key={c.title} className="reveal flex flex-col gap-4">
            <div inert aria-hidden="true" className="relative h-[300px] overflow-hidden rounded-[24px] bg-panel">
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
