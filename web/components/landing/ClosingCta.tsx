import { DeviceMobileIcon, GoogleChromeLogoIcon, StarIcon } from '@phosphor-icons/react/dist/ssr'
import { Button, buttonVariants } from '@/components/ui/button'
import { SendToComputer } from '@/components/site/SendToComputer'
import { STORE_RATING } from '@/lib/structured-data'
import { storeUrl } from '@/lib/utils'
import { TailorRun } from './TailorRun'

export function ClosingCta() {
  return (
    <section id="get-started" className="container py-10">
      <div className="grid items-center gap-12 overflow-hidden rounded-[32px] bg-[#E4E3FF] px-16 py-16 max-lg:px-8 max-md:px-5 max-md:py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)]">
        <div className="flex flex-col gap-6 max-lg:items-center max-lg:text-center">
          <h2 className="max-w-[560px] text-[clamp(34px,4.6vw,58px)] leading-[1.02] tracking-[-0.035em]">
            Tailor your next application in 30 seconds
          </h2>
          <p className="max-w-[460px] text-[17px] leading-[1.55] text-ink-2">
            That was Northwind. Install Cover Me, open your next posting and click the icon. The first one is free.
          </p>
          <Button asChild size="lg" className="self-start max-lg:self-center [@media(pointer:coarse)]:hidden">
            <a href={storeUrl('closing')} target="_blank" rel="noreferrer">
              <GoogleChromeLogoIcon size={18} />
              Add to Chrome, it&apos;s free
            </a>
          </Button>
          <div className="flex flex-col gap-2 self-start max-lg:items-center max-lg:self-center [@media(pointer:fine)]:hidden">
            <SendToComputer placement="closing" className={buttonVariants({ size: 'lg' })}>
              <DeviceMobileIcon size={18} aria-hidden />
              Send this to my computer
            </SendToComputer>
            <a href={storeUrl('closing')} target="_blank" rel="noreferrer" className="text-[13px] text-subtle underline underline-offset-2">
              See it on the Chrome Web Store
            </a>
          </div>
          <a
            href={storeUrl('closing-rating')}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 self-start text-[13px] text-subtle underline-offset-2 hover:underline max-lg:self-center"
          >
            <StarIcon size={14} weight="fill" className="text-brand-strong" aria-hidden />
            {STORE_RATING.value.toFixed(1)} on the Chrome Web Store
          </a>
        </div>
        <div className="mx-auto w-full max-w-[480px]">
          <TailorRun />
        </div>
      </div>
    </section>
  )
}
