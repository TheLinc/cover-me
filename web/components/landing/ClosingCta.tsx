import { GoogleChromeLogoIcon } from '@phosphor-icons/react/dist/ssr'
import { Button } from '@/components/ui/button'
import { CHROME_STORE_URL } from '@/lib/utils'
import { ExtensionPopup, PopupButton } from './ExtensionPopup'

export function ClosingCta() {
  return (
    <section className="container py-10">
      <div className="relative flex min-h-[420px] flex-col justify-center gap-6 overflow-hidden rounded-[32px] bg-[#E4E3FF] px-16 py-16 max-md:px-6 max-md:py-12">
        <h2 className="max-w-[600px] text-[clamp(36px,4.6vw,60px)] leading-[1.02] tracking-[-0.035em]">
          Tailor your next application in 10 seconds
        </h2>
        <Button asChild size="lg" className="self-start">
          <a href={CHROME_STORE_URL} target="_blank" rel="noreferrer">
            <GoogleChromeLogoIcon size={18} />
            Add to Chrome, it&apos;s free
          </a>
        </Button>
        <div inert aria-hidden="true" className="absolute right-20 top-16 w-[290px] rotate-[-3deg] max-lg:hidden">
          <ExtensionPopup>
            <div className="flex flex-col gap-2.5 px-4 py-5">
              <PopupButton primary>Tailor resume to job</PopupButton>
              <PopupButton>Generate cover letter</PopupButton>
            </div>
          </ExtensionPopup>
        </div>
      </div>
    </section>
  )
}
