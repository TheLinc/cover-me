import { ArrowUpRightIcon } from '@phosphor-icons/react/dist/ssr'
import { PatternNote } from '@/components/brand/PatternNote'

export function OpenSource() {
  return (
    <section className="bg-tissue-2 py-28 max-md:py-20">
      <div className="container grid grid-cols-[1fr_380px] items-center gap-20 max-lg:grid-cols-1 max-lg:gap-12">
        <div className="reveal flex flex-col gap-6">
          <PatternNote>Open source</PatternNote>
          <h2 className="text-[clamp(34px,4.4vw,58px)] leading-none text-ink">The pattern is public.</h2>
          <p className="max-w-[540px] text-[16px] leading-[1.7] text-ink-2">
            The extension and backend are MIT licensed and fully public on GitHub. Read every line of code, verify our privacy model, self-host with your own Supabase and Stripe, or contribute a scraper for a new job board.
          </p>
          <PatternNote as="p">MIT License · No telemetry · No ads</PatternNote>
        </div>
        <a
          href="https://github.com/TheLinc/cover-me"
          target="_blank"
          rel="noreferrer"
          className="reveal group block -rotate-2 border-[1.5px] border-ink bg-tissue p-6 shadow-[6px_6px_0_var(--ink)] transition-transform hover:rotate-0 max-lg:max-w-[380px]"
        >
          <div className="flex items-center justify-between border-b-[1.5px] border-ink pb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink">
            <span>Pattern no. MIT</span>
            <span>Sizes: all</span>
          </div>
          <p className="mt-6 font-display text-[60px] leading-none text-ink">Cover Me</p>
          <p className="mt-2 font-mono text-[12px] text-ink-2">github.com/TheLinc/cover-me</p>
          <div className="mt-8 grid grid-cols-3 border-t border-dashed border-line pt-4 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-2">
            <span>Extension</span>
            <span>Backend</span>
            <span>Web</span>
          </div>
          <span className="mt-6 inline-flex items-center gap-1.5 text-[14px] font-semibold text-thread group-hover:text-thread-deep">
            View on GitHub <ArrowUpRightIcon size={13} />
          </span>
        </a>
      </div>
    </section>
  )
}
