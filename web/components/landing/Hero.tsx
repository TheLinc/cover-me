import { GoogleChromeLogoIcon } from '@phosphor-icons/react/dist/ssr'
import { Button } from '@/components/ui/button'
import { CHROME_STORE_URL } from '@/lib/utils'
import { STORE_RATING } from '@/lib/structured-data'
import { HeroStage } from './HeroStage'

export function Hero() {
  return (
    <section className="container pb-6 pt-16 max-md:pt-10">
      <div className="mx-auto flex max-w-[1060px] flex-col items-center gap-6 text-center">
        <h1 className="text-balance text-[clamp(40px,6vw,76px)] leading-[1.02] tracking-[-0.035em]">
          Your resume and cover letter, tailored to every job.
        </h1>
        <p className="max-w-[600px] text-[19px] leading-[1.5] text-ink-2 max-md:text-[17px]">
          One click on any job posting. Cover Me matches the ATS keywords and writes the letter.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <a href={CHROME_STORE_URL} target="_blank" rel="noreferrer">
              <GoogleChromeLogoIcon size={18} />
              Add to Chrome, it&apos;s free
            </a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="#how-it-works">See how it works</a>
          </Button>
        </div>
        <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 font-mono text-[12px] text-subtle">
          <span>{STORE_RATING.value.toFixed(1)} on Chrome Web Store</span>
          <span aria-hidden="true">/</span>
          <span>Free with your own key</span>
          <span aria-hidden="true">/</span>
          <span>Open source</span>
        </p>
      </div>
      <div className="mt-12">
        <HeroStage />
      </div>
    </section>
  )
}
