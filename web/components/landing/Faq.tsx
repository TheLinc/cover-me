import { PlusIcon } from '@phosphor-icons/react/dist/ssr'
import { FAQ_ITEMS, faqJsonLd } from './content'
import { Ambient } from './Ambient'

// Native <details>: keyboard accessible, and answers stay in the HTML for crawlers.
export function Faq() {
  return (
    <section className="container relative isolate py-28 max-md:py-20">
      <Ambient dots={{ left: -40, top: 60, w: 360, h: 280 }} shape={{ right: 10, bottom: 100, size: 110, rotate: -14 }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="mx-auto max-w-[860px]">
        <h2 className="text-center text-[clamp(32px,3.6vw,44px)] leading-[1.05]">Questions</h2>
        <div className="mt-10 flex flex-col gap-2.5">
          {FAQ_ITEMS.map(({ q, a }, i) => (
            <details key={q} open={i === 0} className="accordion group soft-card px-6 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 [&::-webkit-details-marker]:hidden">
                <h3 className="text-[17px] font-medium tracking-[-0.01em]">{q}</h3>
                <PlusIcon size={16} aria-hidden="true" className="shrink-0 text-brand-strong transition-transform group-open:rotate-45" />
              </summary>
              <p className="pt-3 text-[15px] leading-[1.65] text-ink-2">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
