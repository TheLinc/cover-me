import Image from 'next/image'
import Link from 'next/link'
import { CHROME_STORE_URL } from '@/lib/utils'

type FooterLink = { label: string; href: string; external?: boolean }

const COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: 'Product',
    links: [
      { label: 'How it works', href: '/#how-it-works' },
      { label: 'ATS score', href: '/#ats-score' },
      { label: 'Pricing', href: '/#pricing' },
      { label: 'Install', href: CHROME_STORE_URL, external: true },
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
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'GitHub', href: 'https://github.com/TheLinc/cover-me', external: true },
      { label: 'Support', href: '/support' },
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
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

const LINK = 'text-[14px] text-[#D8D5E6] transition-colors hover:text-white'

export function SiteFooter() {
  return (
    <footer className="mt-20 overflow-hidden bg-night text-[var(--on-night-2)]">
      <div className="container grid gap-10 pb-10 pt-16 md:grid-cols-[1.2fr_repeat(4,minmax(0,1fr))]">
        <div className="flex flex-col gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.png" width={28} height={28} alt="" className="rounded-[8px]" />
            <span className="text-[18px] font-semibold tracking-[-0.02em] text-white">Cover Me</span>
          </Link>
          <p className="max-w-[240px] text-[14px] leading-[1.55]">Tailored resumes and cover letters for every job you apply to.</p>
        </div>
        {COLUMNS.map((c) => (
          <div key={c.title} className="flex flex-col gap-3">
            <span className="text-[12px] text-[var(--on-night-2)]">{c.title}</span>
            {c.links.map((l) =>
              l.external ? (
                <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className={LINK}>{l.label}</a>
              ) : (
                <Link key={l.label} href={l.href} className={LINK}>{l.label}</Link>
              ),
            )}
          </div>
        ))}
      </div>
      <div className="container flex justify-between gap-4 border-t border-white/10 py-6 text-[13px] max-sm:flex-col">
        <span>© {new Date().getFullYear()} Cover Me · MIT License</span>
        <span>Built in Canada</span>
      </div>
      <div
        aria-hidden="true"
        className="select-none whitespace-nowrap text-center text-[clamp(96px,21vw,300px)] font-semibold leading-[0.78] tracking-[-0.06em] text-night-2"
      >
        Cover Me
      </div>
    </footer>
  )
}
