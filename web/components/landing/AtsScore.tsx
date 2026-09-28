import { Eyebrow } from '@/components/site/Eyebrow'
import { Chip, EXAMPLE } from './visuals'

function Bar({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div>
      <div className="flex justify-between text-[13px] text-subtle">
        <span>{label}</span>
        <span className={strong ? 'font-semibold text-brand-strong' : 'font-semibold text-body'}>{value}%</span>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#F2F0ED]">
        <div className={strong ? 'h-3 rounded-full bg-brand' : 'h-3 rounded-full bg-[#C9C3BC]'} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

export function AtsScore() {
  return (
    <section id="ats-score" className="container py-28 max-md:py-20">
      <div className="reveal mx-auto flex max-w-[820px] flex-col items-center gap-4 text-center">
        <Eyebrow>ATS score</Eyebrow>
        <h2 className="text-[clamp(34px,4vw,52px)] leading-[1.05]">Know how well you match before you hit apply</h2>
        <p className="max-w-[620px] text-[18px] leading-[1.55] text-ink-2">
          The score compares your resume to the posting&apos;s keywords and requirements. Matched skills count up, gaps show in orange.
        </p>
      </div>

      <div className="mt-12 grid gap-5 rounded-[32px] bg-panel p-8 max-md:p-4 lg:grid-cols-3">
        <div className="reveal flex flex-col gap-6 rounded-[20px] bg-white p-7">
          <div className="text-[13px] text-subtle">Match score · example</div>
          <div className="flex flex-col gap-5">
            <Bar label="Before" value={EXAMPLE.before} />
            <div>
              <Bar label="After tailoring" value={EXAMPLE.score} strong />
              <div className="mt-1.5 flex justify-between font-mono text-[10px] text-subtle" aria-hidden="true">
                <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
              </div>
            </div>
          </div>
          <div className="mt-auto text-[44px] font-semibold leading-none tracking-[-0.03em] text-ink">
            +{EXAMPLE.score - EXAMPLE.before} <span className="text-[16px] font-medium tracking-normal text-subtle">points</span>
          </div>
        </div>

        <div className="reveal flex flex-col gap-4 rounded-[20px] bg-white p-7">
          <div className="text-[13px] text-subtle">Keywords from the posting</div>
          <div className="flex flex-wrap gap-2">
            {[...EXAMPLE.keywords, EXAMPLE.extraGap].map((k) => {
              const gap = EXAMPLE.gaps.includes(k) || k === EXAMPLE.extraGap
              return <Chip key={k} gap={gap}>{gap ? k : `✓ ${k}`}</Chip>
            })}
          </div>
          <div className="mt-auto flex gap-4 text-[13px] text-subtle">
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-brand" />In your resume</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-gap" />Gap</span>
          </div>
        </div>

        <div className="reveal flex flex-col gap-4 rounded-[20px] bg-ink p-7 text-white">
          <div className="text-[13px] text-[#C7D2FE]">What Cover Me changed</div>
          <p className="text-[14px] leading-[1.55] text-[#C7D2FE] line-through decoration-[#C7D2FE]/50">
            {EXAMPLE.bulletBefore}
          </p>
          <p className="text-[15px] leading-[1.55]">{EXAMPLE.bulletAfter}</p>
          <div className="h-px bg-white/15" />
          <p className="text-[13px] leading-[1.55] text-[#C7D2FE]">
            Gaps stay gaps. Cover Me won&apos;t claim {EXAMPLE.extraGap} experience you don&apos;t have. It tells you what&apos;s missing instead.
          </p>
        </div>
      </div>
    </section>
  )
}
