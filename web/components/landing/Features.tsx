import { LetterDoc, Line } from './visuals'

function HistoryRow({ label, score, faded }: { label: string; score: number; faded?: boolean }) {
  return (
    <div className={`flex justify-between rounded-[12px] bg-white px-4 py-3.5 text-[13px] ${faded ? 'opacity-60' : ''}`}>
      <span className="font-medium text-ink">{label}</span>
      <span className="text-brand-strong">{score}%</span>
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
        <div className="flex h-[220px] w-[170px] flex-col gap-2 rounded-[12px] bg-white p-[18px] shadow-[0_14px_34px_-20px_rgba(30,27,75,0.3)]">
          <div className="h-2 w-[60%] rounded-full bg-ink" />
          <Line w="90%" className="h-[5px]" />
          <Line w="80%" className="h-[5px]" />
          <Line w="85%" className="h-[5px]" />
          <Line w="70%" className="h-[5px]" />
          <Line w="88%" className="h-[5px]" />
          <span className="mt-auto self-start rounded-full bg-brand-tint px-2 py-1 font-mono text-[10px] text-brand-ink">1 page · PDF</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Every application in one history',
    body: 'Reopen any letter or resume. Pro syncs it across devices.',
    visual: (
      <div className="flex h-full flex-col justify-center gap-2.5 p-7">
        <HistoryRow label="Northwind · Frontend" score={86} />
        <HistoryRow label="Acme · Design Engineer" score={81} />
        <HistoryRow label="Globex · UI Engineer" score={77} faded />
      </div>
    ),
  },
]

export function Features() {
  return (
    <section className="container py-28 max-md:py-20">
      <h2 className="max-w-[700px] text-[clamp(34px,4vw,52px)] leading-[1.05]">Everything you need to apply, in one popup</h2>
      <div className="mt-10 grid gap-5 lg:grid-cols-3">
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
