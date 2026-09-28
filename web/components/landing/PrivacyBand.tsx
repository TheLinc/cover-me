import { ArrowUpRightIcon, GithubLogoIcon } from '@phosphor-icons/react/dist/ssr'

const FACTS = [
  { big: 'AES-256', small: 'Encrypted on device and at rest' },
  { big: 'Your key', small: 'Claude or OpenAI, never logged' },
  { big: 'MIT', small: 'Open source, self-hostable' },
  { big: 'No ads', small: 'No telemetry, no tracking' },
]

export function PrivacyBand() {
  return (
    <section className="container py-10">
      <div className="relative grid items-center gap-12 overflow-hidden rounded-[32px] bg-night px-16 py-16 max-md:px-6 max-md:py-12 lg:grid-cols-2 lg:py-[72px]">
        {/* Oversized GitHub mark, cropped off the corner: the open-source story as texture. */}
        <GithubLogoIcon
          weight="fill"
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-[22%] -left-[6%] size-[520px] rotate-[-12deg] text-night-2 max-md:-right-[22%] max-md:-top-[4%] max-md:bottom-auto max-md:left-auto max-md:size-[280px]"
        />
        <div className="relative flex flex-col gap-5">
          <h2 className="text-[clamp(32px,3.6vw,48px)] leading-[1.05] !text-[var(--on-night)]">Your resume stays yours</h2>
          <p className="text-[17px] leading-[1.6] text-[var(--on-night-2)]">
            Bring your own API key and nothing leaves your browser. Hosted mode encrypts your resume at rest. The code is open source.
          </p>
          <a
            href="https://github.com/TheLinc/cover-me"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 self-start rounded-full border border-white/20 px-5 py-2.5 text-[14px] text-[var(--on-night)] transition-colors hover:border-white/50"
          >
            Read the code on GitHub <ArrowUpRightIcon size={13} />
          </a>
        </div>
        <div className="relative grid grid-cols-2 gap-3.5">
          {FACTS.map((f) => (
            <div key={f.big} className="flex flex-col gap-2 rounded-[18px] bg-night-2 p-6 max-md:p-4">
              <div className="whitespace-nowrap text-[22px] font-semibold text-white max-md:text-[18px]">{f.big}</div>
              <div className="text-[13px] text-[var(--on-night-2)]">{f.small}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
