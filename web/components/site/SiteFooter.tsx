import Link from 'next/link'
import { CHROME_STORE_URL } from '@/lib/utils'

type FooterLink = { label: string; href: string; external?: boolean }

const COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: 'Product',
    links: [
      { label: 'How it works', href: '/#how-it-works' },
      { label: 'Features', href: '/#features' },
      { label: 'Pricing', href: '/#pricing' },
      { label: 'Install', href: CHROME_STORE_URL, external: true },
    ],
  },
  {
    title: 'Open source',
    links: [
      { label: 'GitHub', href: 'https://github.com/TheLinc/cover-me', external: true },
      { label: 'About', href: '/about' },
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
      { label: 'Support', href: '/support' },
    ],
  },
  {
    title: 'Guides',
    links: [
      { label: 'What is an ATS score?', href: '/guides/what-is-an-ats-score' },
      { label: 'Cover Me vs ChatGPT', href: '/guides/cover-me-vs-chatgpt' },
      { label: 'Tailor your resume', href: '/guides/tailor-resume-to-job-description' },
      { label: 'All guides', href: '/guides' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Sign in', href: '/auth' },
      { label: 'Upgrade to Pro', href: '/auth?plan=pro' },
      { label: 'Dashboard', href: '/dashboard' },
    ],
  },
]

// A loose thread that loops once and runs down into the wordmark.
const THREAD = 'M-20 70 C 180 20, 300 150, 420 80 C 480 45, 470 5, 440 20 C 410 35, 450 95, 520 110 C 600 128, 640 150, 660 190'

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-night text-[rgba(242,234,219,0.72)]">
      <svg
        data-footer-thread
        viewBox="0 0 1000 190"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[190px] w-full"
      >
        <path
          d={THREAD}
          pathLength={1}
          className="footer-thread fill-none stroke-thread"
          strokeWidth={2}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="container relative pb-10 pt-44 max-md:pt-36">
        <svg viewBox="0 0 1000 190" className="stitch-draw w-full" role="img" aria-label="Cover Me">
          <text
            x="500"
            y="150"
            textAnchor="middle"
            className="stitch-text"
            style={{ fontFamily: 'var(--font-display)', fontSize: 190, fontWeight: 500 }}
          >
            Cover Me
          </text>
        </svg>
        <p className="mt-4 text-center font-display text-[clamp(26px,3vw,40px)] italic text-tissue">
          Made to measure.
        </p>
        <div className="mt-24 grid grid-cols-4 gap-8 border-t border-dashed border-[rgba(242,234,219,0.2)] pt-10 max-md:grid-cols-2">
          {COLUMNS.map((c) => (
            <div key={c.title} className="flex flex-col gap-2.5">
              <span className="mb-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[rgba(242,234,219,0.6)]">
                {c.title}
              </span>
              {c.links.map((l) =>
                l.external ? (
                  <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="text-[13px] transition-colors hover:text-tissue">
                    {l.label}
                  </a>
                ) : (
                  <Link key={l.label} href={l.href} className="text-[13px] transition-colors hover:text-tissue">
                    {l.label}
                  </Link>
                ),
              )}
            </div>
          ))}
        </div>
        <div className="mt-12 flex justify-between font-mono text-[10.5px] uppercase tracking-[0.14em] text-[rgba(242,234,219,0.6)] max-sm:flex-col max-sm:gap-2">
          <span>© {new Date().getFullYear()} Cover Me · MIT License</span>
          <span>Built in Canada</span>
        </div>
      </div>
    </footer>
  )
}
