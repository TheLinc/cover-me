import { CheckIcon } from '@phosphor-icons/react/dist/ssr'
import { CHROME_STORE_URL } from '@/lib/utils'
import { Ambient } from './Ambient'

const FREE = ['10 AI generations to start, then 5 a week, letters and resumes', 'Unlimited with your own API key', 'PDF export and local history']
const PRO = ['Up to 25 letters or tailored resumes a day', 'History synced across devices', 'Early access to new features']

export function Pricing() {
  return (
    <section id="pricing" className="container relative isolate py-28 max-md:py-20">
      <Ambient
        glows={[{ left: 'calc(50% - 420px)', top: 60, size: 840, tone: 'brand' }]}
        shape={{ left: 0, top: 140, size: 150, rotate: 18 }}
      />
      <h2 className="mx-auto max-w-[760px] text-center text-[clamp(34px,4vw,52px)] leading-[1.05]">
        Free to start. $15 when you&apos;re applying a lot.
      </h2>
      <div className="mx-auto mt-12 grid max-w-[860px] gap-5 md:grid-cols-2">
        <div className="reveal soft-card flex flex-col gap-5 p-9">
          <div className="text-[15px] font-semibold text-ink-2">Free</div>
          <div className="text-[56px] font-semibold leading-none tracking-[-0.04em] text-ink">$0</div>
          <ul className="flex flex-col gap-3 text-[15px] text-body">
            {FREE.map((f) => (
              <li key={f} className="flex items-start gap-2.5"><CheckIcon size={16} className="mt-[3px] shrink-0 text-subtle" />{f}</li>
            ))}
          </ul>
          <a href={CHROME_STORE_URL} target="_blank" rel="noreferrer" className="mt-auto rounded-full bg-panel py-3.5 text-center text-[15px] font-medium text-ink transition-colors hover:bg-line">
            Install free
          </a>
        </div>
        <div className="reveal flex flex-col gap-5 rounded-[24px] bg-ink p-9 text-white">
          <div className="flex items-center justify-between">
            <span className="text-[15px] font-semibold">Pro</span>
            <span className="rounded-full bg-brand px-2.5 py-1 text-[12px]">Most popular</span>
          </div>
          <div className="text-[56px] font-semibold leading-none tracking-[-0.04em]">
            $15<span className="text-[16px] font-medium tracking-normal text-[#C7D2FE]">/month</span>
          </div>
          <div className="-mt-3 text-[14px] text-[#C7D2FE]">or $35 every 3 months</div>
          <ul className="flex flex-col gap-3 text-[15px] text-[#E0E7FF]">
            {PRO.map((f) => (
              <li key={f} className="flex items-start gap-2.5"><CheckIcon size={16} className="mt-[3px] shrink-0 text-[#C7D2FE]" />{f}</li>
            ))}
          </ul>
          <a href="/auth?plan=pro" className="mt-auto rounded-full bg-brand-strong py-3.5 text-center text-[15px] font-medium text-white transition-colors hover:bg-brand-deep">
            Get Pro
          </a>
        </div>
      </div>
    </section>
  )
}
