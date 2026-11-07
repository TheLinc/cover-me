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

const PAGE = 'flex h-[200px] w-[150px] flex-col rounded-[6px] bg-white shadow-[0_18px_40px_-20px_rgba(30,27,75,0.35)]'
const tailored = (k: string) => <span className="rounded-[1px] bg-brand-tint text-brand-ink">{k}</span>

// The extension's standard layout: one serif column.
function TemplatePage() {
  const rule = <div className="mt-1 h-px bg-ink" />
  return (
    <div className={`${PAGE} px-3.5 py-3.5 font-serif`}>
      <div className="text-center text-[10px] font-bold tracking-[0.04em] text-ink">ALEX RIVERA</div>
      <div className="text-center text-[5px] text-subtle">alex@example.com · Chicago, IL</div>
      <div className="mt-2 text-[6px] font-bold uppercase tracking-[0.08em] text-ink">Experience</div>
      {rule}
      <div className="mt-1 flex justify-between text-[5.5px] font-bold text-ink"><span>Brightline</span><span>2021 – now</span></div>
      {['campaign strategy', 'budget', 'SEO'].map((k) => (
        <div key={k} className="mt-1 flex gap-1 text-[5px] leading-[1.4] text-body">
          <span>•</span>
          <span>… {tailored(k)} …</span>
        </div>
      ))}
      <div className="mt-2 text-[6px] font-bold uppercase tracking-[0.08em] text-ink">Skills</div>
      {rule}
      <div className="mt-1 text-[5px] text-body">Google Analytics · A/B testing · Copywriting · Team leadership</div>
    </div>
  )
}

// A made-up user design, to read as "not ours" at a glance: sans, a dark
// header band and a sidebar. Not a real template the extension ships.
function OwnDesignPage() {
  return (
    <div className={`${PAGE} overflow-hidden font-sans`}>
      <div className="bg-ink px-3 py-2.5 text-white">
        <div className="text-[10px] font-semibold tracking-[-0.01em]">Alex Rivera</div>
        <div className="text-[5px] opacity-70">Marketing Lead</div>
      </div>
      <div className="flex flex-1">
        <div className="w-[46px] bg-panel px-2 py-2 text-[4.5px] leading-[1.6] text-body">
          <div className="mb-0.5 text-[5px] font-semibold text-ink">Skills</div>
          <div>Analytics</div>
          <div>A/B testing</div>
          <div>Copywriting</div>
        </div>
        <div className="flex-1 px-2.5 py-2">
          <div className="text-[5.5px] font-semibold text-ink">Brightline</div>
          <div className="text-[4.5px] text-subtle">2021 – now</div>
          {['campaign strategy', 'budget', 'SEO'].map((k) => (
            <div key={k} className="mt-1 text-[5px] leading-[1.4] text-body">… {tailored(k)} …</div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Layout({ page, label }: { page: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      {page}
      <Badge variant="tint" className="text-[10.5px]">{label}</Badge>
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
    title: 'Your design or ours',
    body: 'Upload a Word file to keep your own fonts and layout (beta), or use the ATS-ready Cover Me template. Both download as Word, and the template as PDF too.',
    visual: (
      <div className="flex h-full items-center justify-center gap-3">
        <Layout page={<OwnDesignPage />} label="Your .docx · Beta" />
        <Layout page={<TemplatePage />} label="Cover Me template" />
      </div>
    ),
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
