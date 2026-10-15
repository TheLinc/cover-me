import { GoogleChromeLogoIcon } from '@phosphor-icons/react/dist/ssr'
import { Button } from '@/components/ui/button'
import { CHROME_STORE_URL } from '@/lib/utils'
import { STORE_RATING } from '@/lib/structured-data'
import { Ambient } from './Ambient'

// Split hero: the promise on the left, the product on a job posting on the
// right. The picture is a real capture of the extension's popup on the
// Northwind posting (the same application the rest of the page follows), so
// what it shows is what installs. Phones get their own stacked composition.
// No client JavaScript: it renders on the server and paints on the first frame.
export function Hero() {
  return (
    <section className="container pb-10 pt-8">
      <div className="stage-grid relative isolate grid items-center gap-10 overflow-hidden rounded-[32px] px-12 py-10 max-lg:px-6 max-md:gap-8 max-md:px-4 max-md:py-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,560px)] xl:px-14">
        <Ambient glows={[{ right: -160, top: -120, size: 820, tone: 'brand' }, { left: '30%', bottom: -320, size: 620, tone: 'warm' }]} />
        <div className="flex flex-col gap-6 max-xl:items-center max-xl:text-center max-md:gap-5">
          <h1 className="text-balance max-w-[640px] text-[clamp(34px,4.3vw,60px)] leading-[1.02] tracking-[-0.035em]">
            Tailor your resume to any job posting.
          </h1>
          <p className="max-w-[500px] text-[18px] leading-[1.5] text-ink-2 max-md:text-[16px]">
            One click on the posting. Cover Me rewrites your real experience in its words, scores the ATS match and writes the cover letter to go with it.
          </p>
          <div className="flex flex-wrap gap-3 max-xl:justify-center">
            <Button asChild size="lg">
              <a href={CHROME_STORE_URL} target="_blank" rel="noreferrer">
                <GoogleChromeLogoIcon size={18} />
                Add to Chrome, it&apos;s free
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="max-sm:hidden">
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
        <picture data-hero-stage className="mx-auto block w-full max-w-[560px] max-sm:max-w-[360px]">
          <source media="(min-width: 640px)" srcSet="/hero/hero-desktop.webp" width={1320} height={1120} />
          <img
            src="/hero/hero-phone.webp"
            width={720}
            height={1080}
            alt="The Cover Me popup open on a Northwind job posting, showing an 86 ATS match with HubSpot missing, next to the tailored resume."
            fetchPriority="high"
            className="h-auto w-full"
          />
        </picture>
      </div>
    </section>
  )
}
