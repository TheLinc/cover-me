import { GoogleChromeLogoIcon } from '@phosphor-icons/react/dist/ssr'
import { Button } from '@/components/ui/button'
import { CHROME_STORE_URL } from '@/lib/utils'
import { STORE_RATING } from '@/lib/structured-data'
import { Ambient } from './Ambient'
import { HeroStage } from './HeroStage'

// Split hero: the promise on the left, the result on the right, both above the
// fold at 1280×720. Narrower screens stack them; phones get a compact result card.
export function Hero() {
  return (
    <section className="container pb-10 pt-8">
      <div className="stage-grid relative isolate grid items-center gap-10 overflow-hidden rounded-[32px] px-12 py-10 max-xl:gap-10 max-lg:px-6 max-md:px-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,540px)] xl:px-14">
        <Ambient glows={[{ right: -160, top: -120, size: 820, tone: 'brand' }, { left: '30%', bottom: -320, size: 620, tone: 'warm' }]} />
        <div className="flex flex-col gap-6 max-xl:items-center max-xl:text-center">
          <h1 className="text-balance max-w-[720px] text-[clamp(40px,4.3vw,60px)] leading-[1.02] tracking-[-0.035em]">
            Your resume and cover letter, tailored to every job.
          </h1>
          <p className="max-w-[500px] text-[18px] leading-[1.5] text-ink-2 max-md:text-[17px]">
            One click on the job posting. Cover Me rewords your real experience in the employer&apos;s terms and writes the letter to match.
          </p>
          <div className="flex flex-wrap gap-3 max-xl:justify-center">
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
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11.5px] text-subtle max-xl:justify-center">
            <span>{STORE_RATING.value.toFixed(1)} on Chrome Web Store</span>
            <span aria-hidden="true">/</span>
            <span>Free with your own key</span>
            <span aria-hidden="true">/</span>
            <span>Open source</span>
          </p>
        </div>
        <HeroStage />
      </div>
    </section>
  )
}
