import Link from 'next/link'

const BOARDS: { name: string; href?: string }[] = [
  { name: 'LinkedIn', href: '/for/linkedin' },
  { name: 'Indeed', href: '/for/indeed' },
  { name: 'Greenhouse', href: '/for/greenhouse' },
  { name: 'Lever', href: '/for/lever' },
  { name: 'Workday', href: '/for/workday' },
  { name: 'Ashby', href: '/for/ashby' },
  { name: 'Any job board' },
]

const LABEL = 'font-mono text-[12.5px] uppercase tracking-[0.1em] text-ink'

// The supported boards printed on a tape measure.
export function BoardsTape() {
  return (
    <section aria-label="Supported job boards" className="container py-12">
      <div className="tape flex min-h-14 flex-wrap items-end gap-x-8 gap-y-1 rounded-[2px] px-5 pb-2.5 pt-5 shadow-[0_2px_0_rgba(28,26,23,0.15)]">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink">Works on</span>
        {BOARDS.map((b) =>
          b.href ? (
            <Link key={b.name} href={b.href} className={`${LABEL} underline-offset-4 hover:underline`}>
              {b.name}
            </Link>
          ) : (
            <span key={b.name} className={LABEL}>
              {b.name}
            </span>
          ),
        )}
      </div>
    </section>
  )
}
