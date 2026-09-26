import { GoogleChromeLogoIcon } from '@phosphor-icons/react/dist/ssr'
import { Button } from '@/components/ui/button'
import { PatternNote } from '@/components/brand/PatternNote'
import { CHROME_STORE_URL } from '@/lib/utils'
import { STORE_RATING } from '@/lib/structured-data'
import { HeroScene } from './HeroScene'
import { WorkflowDemo } from './WorkflowDemo'

export function Hero() {
  return (
    <section className="relative pb-10 pt-14 max-md:pt-8">
      <div className="container">
        <div className="grid grid-cols-[1fr_1.1fr] items-center gap-10 max-lg:grid-cols-1 max-lg:gap-6">
          <div className="reveal flex flex-col items-start gap-6 max-lg:items-center max-lg:text-center">
            <PatternNote>AI cover letter generator &amp; resume tailor</PatternNote>
            <h1 className="text-[clamp(44px,6.2vw,92px)] leading-[0.95] text-ink">
              One resume doesn&rsquo;t fit <em className="italic text-thread">every</em> job.
            </h1>
            <p className="max-w-[500px] text-[17px] leading-[1.6] text-ink-2">
              Cover Me tailors yours to each posting&rsquo;s ATS keywords and writes the cover letter, in one click.
            </p>
            <p className="flex items-baseline gap-3 text-ink-2">
              <span className="font-display text-[28px] leading-none line-through decoration-thread decoration-2">45 min</span>
              <span aria-hidden="true" className="font-mono">→</span>
              <span className="font-display text-[28px] leading-none text-ink">10 sec</span>
              <PatternNote>per application</PatternNote>
            </p>
            <div className="flex flex-wrap gap-3 max-lg:justify-center">
              <Button asChild size="lg">
                <a href={CHROME_STORE_URL} target="_blank" rel="noreferrer">
                  <GoogleChromeLogoIcon size={16} />
                  Install free · Chrome
                </a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#pricing">See pricing</a>
              </Button>
            </div>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-2 max-lg:justify-center">
              <span>★ {STORE_RATING.value.toFixed(1)} on Chrome Web Store</span>
              <span aria-hidden="true">/</span>
              <span>Free forever</span>
              <span aria-hidden="true">/</span>
              <span>BYOK or hosted</span>
              <span aria-hidden="true">/</span>
              <span>Open source · MIT</span>
            </p>
          </div>
          <HeroScene />
        </div>

        <div className="mt-20 flex flex-col gap-4 max-md:mt-12">
          <PatternNote>See it work · one posting, one click</PatternNote>
          <WorkflowDemo />
        </div>
      </div>
    </section>
  )
}
