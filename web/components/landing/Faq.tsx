import { PlusIcon } from '@phosphor-icons/react/dist/ssr'
import { PatternNote } from '@/components/brand/PatternNote'
import { FAQ_ITEMS, faqJsonLd } from './content'

// Native <details>: keyboard accessible, and answers stay in the HTML for crawlers.
export function Faq() {
  return (
    <section className="py-28 max-md:py-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="container grid grid-cols-[1fr_1.6fr] gap-16 max-lg:grid-cols-1 max-lg:gap-10">
        <div className="reveal flex flex-col gap-4">
          <PatternNote>FAQ</PatternNote>
          <h2 className="text-[clamp(34px,4.4vw,58px)] leading-none text-ink">Common questions</h2>
        </div>
        <div className="border-t-[1.5px] border-ink">
          {FAQ_ITEMS.map(({ q, a }) => (
            <details key={q} className="group border-b border-dashed border-line">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 [&::-webkit-details-marker]:hidden">
                <h3 className="font-display text-[21px] leading-[1.3] text-ink">{q}</h3>
                <PlusIcon size={16} aria-hidden="true" className="shrink-0 text-thread transition-transform group-open:rotate-45" />
              </summary>
              <p className="pb-7 pr-10 text-[15px] leading-[1.8] text-ink-2">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
