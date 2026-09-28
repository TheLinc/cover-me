import { GoogleChromeLogoIcon } from '@phosphor-icons/react/dist/ssr'
import { Button } from '@/components/ui/button'
import { CHROME_STORE_URL } from '@/lib/utils'
import { TailorRun } from './TailorRun'

export function ClosingCta() {
  return (
    <section className="container py-10">
      <div className="grid items-center gap-12 overflow-hidden rounded-[32px] bg-[#E4E3FF] px-16 py-16 max-lg:px-8 max-md:px-5 max-md:py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)]">
        <div className="flex flex-col gap-6 max-lg:items-center max-lg:text-center">
          <h2 className="max-w-[560px] text-[clamp(34px,4.6vw,58px)] leading-[1.02] tracking-[-0.035em]">
            Tailor your next application in 30 seconds
          </h2>
          <p className="max-w-[460px] text-[17px] leading-[1.55] text-ink-2">
            One click reads the posting, rewrites your resume for its keywords, and writes the cover letter.
          </p>
          <Button asChild size="lg" className="self-start max-lg:self-center">
            <a href={CHROME_STORE_URL} target="_blank" rel="noreferrer">
              <GoogleChromeLogoIcon size={18} />
              Add to Chrome, it&apos;s free
            </a>
          </Button>
        </div>
        <div className="mx-auto w-full max-w-[480px]">
          <TailorRun />
        </div>
      </div>
    </section>
  )
}
