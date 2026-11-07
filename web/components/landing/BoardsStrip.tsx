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

function Board({ name, logo, href }: (typeof BOARDS)[number]) {
  const body = (
    <>
      <Image src={logo} width={20} height={20} alt="" className="rounded-[5px] object-contain opacity-70 grayscale transition group-hover:opacity-100 group-hover:grayscale-0" />
      {name}
    </>
  )
  const cls = 'group flex items-center gap-2 whitespace-nowrap text-[15px] font-semibold tracking-[-0.01em] text-ink-2'
  return href ? <Link href={href} className={cls}>{body}</Link> : <span className={cls}>{body}</span>
}

// Static, not a marquee: a skimmer has to see every site, LinkedIn and Indeed
// first, without waiting for a loop.
export function BoardsStrip() {
  return (
    <section aria-label="Supported job sites" className="container py-6">
      <div className="soft-card flex flex-col gap-4 px-8 py-6 max-md:px-5">
        <p className="text-[14px] text-subtle">
          Reads postings on these sites. Anywhere else, <span className="font-medium text-ink">paste it in</span>.
        </p>
        <div className="grid grid-cols-4 gap-x-6 gap-y-3 max-sm:grid-cols-2 lg:flex lg:justify-between">
          {BOARDS.map((b) => <Board key={b.name} {...b} />)}
        </div>
      </div>
    </section>
  )
}
