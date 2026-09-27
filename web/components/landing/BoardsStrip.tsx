import Image from 'next/image'
import Link from 'next/link'

// Sites the extension reads automatically: dedicated scrapers or tested ATS
// support (extension/src/content/scrapers, EMBEDDED_ATS_HOSTS). Keep in sync;
// never claim "any job page" here. Everything else works through paste.
const BOARDS = [
  { name: 'LinkedIn', logo: '/boards/linkedin.svg', href: '/for/linkedin' },
  { name: 'Indeed', logo: '/boards/indeed.svg', href: '/for/indeed' },
  { name: 'Greenhouse', logo: '/boards/greenhouse.svg', href: '/for/greenhouse' },
  { name: 'Lever', logo: '/boards/lever.png', href: '/for/lever' },
  { name: 'Workday', logo: '/boards/workday.png', href: '/for/workday' },
  { name: 'Ashby', logo: '/boards/ashby.png', href: '/for/ashby' },
  { name: 'BambooHR', logo: '/boards/bamboohr.png' },
  { name: 'Workable', logo: '/boards/workable.png' },
]

function Board({ name, logo, href, hidden }: (typeof BOARDS)[number] & { hidden?: boolean }) {
  const body = (
    <>
      <Image src={logo} width={24} height={24} alt="" className="rounded-[6px] object-contain opacity-70 grayscale transition group-hover:opacity-100 group-hover:grayscale-0" />
      {name}
    </>
  )
  const cls = 'group flex shrink-0 items-center gap-2.5 whitespace-nowrap text-[18px] font-semibold tracking-[-0.02em] text-ink-2'
  return href && !hidden ? (
    <Link href={href} className={cls}>{body}</Link>
  ) : (
    <span className={cls} aria-hidden={hidden || undefined}>{body}</span>
  )
}

export function BoardsStrip() {
  return (
    <section aria-label="Supported job sites" className="container py-6">
      <div className="soft-card flex items-center gap-8 overflow-hidden px-8 py-6 max-md:flex-col max-md:items-start max-md:gap-4 max-md:px-5">
        <span className="shrink-0 text-[14px] text-subtle">Reads postings on</span>
        <div className="min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)] max-md:w-full">
          <div className="marquee flex w-max gap-12">
            {BOARDS.map((b) => <Board key={b.name} {...b} />)}
            {BOARDS.map((b) => <Board key={`dup-${b.name}`} {...b} hidden />)}
          </div>
        </div>
        <span className="shrink-0 border-l border-line pl-6 text-[14px] text-subtle max-md:border-0 max-md:pl-0">
          Anywhere else, <span className="font-medium text-ink">paste it in</span>
        </span>
      </div>
    </section>
  )
}
