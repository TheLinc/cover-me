import type { ReactNode } from 'react'
import { CheckIcon } from '@phosphor-icons/react/dist/ssr'
import { Button } from '@/components/ui/button'
import { PatternNote } from '@/components/brand/PatternNote'
import { CHROME_STORE_URL, cn } from '@/lib/utils'
import { FREE_FEATURES, PRO_FEATURES } from './content'

// A paper hang tag on a string. The string runs into the punched hole.
function HangTag({ dark, children }: { dark?: boolean; children: ReactNode }) {
  return (
    <div className="reveal relative flex flex-col pt-16">
      <svg
        aria-hidden="true"
        viewBox="0 0 100 88"
        preserveAspectRatio="none"
        className="absolute left-1/2 top-0 z-10 h-[88px] w-20 -translate-x-1/2"
      >
        <path d="M50 0 C 30 30, 70 50, 50 88" className="fill-none stroke-ink" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className={cn('tag relative flex flex-1 flex-col px-9 pb-10 pt-16', dark ? 'bg-ink text-tissue' : 'bg-tissue-2 text-ink')}>
        <span aria-hidden="true" className="absolute left-1/2 top-5 size-4 -translate-x-1/2 rounded-full bg-tissue ring-1 ring-line" />
        {children}
      </div>
    </div>
  )
}

export function Pricing() {
  return (
    <section id="pricing" className="py-28 max-md:py-20">
      <div className="container">
        <div className="reveal mb-8 flex max-w-[640px] flex-col gap-4">
          <PatternNote>Pricing</PatternNote>
          <h2 className="text-[clamp(34px,4.4vw,58px)] leading-none text-ink">Start free. Upgrade when you&apos;re ready.</h2>
          <p className="text-[16px] leading-[1.65] text-ink-2">No contracts. Cancel any time. Or use your own API key for free, forever.</p>
        </div>
        <div className="grid max-w-[820px] grid-cols-2 gap-10 max-md:grid-cols-1">
          <HangTag>
            <PatternNote>Free</PatternNote>
            <p className="mt-3 flex items-baseline gap-1">
              <span className="font-display text-[64px] leading-none">$0</span>
              <span className="text-[14px] text-ink-2">/forever</span>
            </p>
            <p className="mt-3 border-b border-dashed border-line pb-6 text-[14px] leading-[1.65] text-ink-2">
              For job seekers who want to move fast without a subscription.
            </p>
            <ul className="mt-6 flex flex-1 flex-col gap-2.5">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[14px] leading-[1.5]">
                  <CheckIcon size={14} className="mt-[3px] shrink-0 text-ink-2" />
                  {f}
                </li>
              ))}
            </ul>
            <Button asChild variant="outline" className="mt-8 w-full">
              <a href={CHROME_STORE_URL} target="_blank" rel="noreferrer">Install free</a>
            </Button>
          </HangTag>
          <HangTag dark>
            <PatternNote className="text-[rgba(242,234,219,0.7)]">Pro · Most popular</PatternNote>
            <p className="mt-3 flex items-baseline gap-1">
              <span className="font-display text-[64px] leading-none text-tissue">$8</span>
              <span className="text-[14px] text-[rgba(242,234,219,0.7)]">/month</span>
            </p>
            <p className="mt-3 border-b border-dashed border-[rgba(242,234,219,0.25)] pb-6 text-[14px] leading-[1.65] text-[rgba(242,234,219,0.75)]">
              For active job seekers who apply to multiple roles a day and want their history everywhere.
            </p>
            <ul className="mt-6 flex flex-1 flex-col gap-2.5">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[14px] leading-[1.5]">
                  <CheckIcon size={14} className="mt-[3px] shrink-0 text-thread" />
                  {f}
                </li>
              ))}
            </ul>
            <Button asChild className="mt-8 w-full">
              <a href="/auth?plan=pro">Get Pro</a>
            </Button>
          </HangTag>
        </div>
      </div>
    </section>
  )
}
