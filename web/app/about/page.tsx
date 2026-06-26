import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { CHROME_STORE_URL } from '@/lib/utils'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'

export const metadata: Metadata = {
  title: 'About',
  description: 'Cover Me is an open-source AI cover letter generator built by Lincoln Laylor. One click on any job posting — a tailored, ATS-friendly cover letter from your resume in under 5 seconds.',
  alternates: { canonical: `${BASE}/about` },
  openGraph: {
    title: 'About — Cover Me',
    description: 'Cover Me is an open-source AI cover letter generator built by Lincoln Laylor. Privacy-first, MIT licensed, no telemetry.',
    url: `${BASE}/about`,
    siteName: 'Cover Me',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'About — Cover Me',
    description: 'Cover Me is an open-source AI cover letter generator built by Lincoln Laylor. Privacy-first, MIT licensed, no telemetry.',
  },
}

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
    { '@type': 'ListItem', position: 2, name: 'About', item: `${BASE}/about` },
  ],
}

const personJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Lincoln Laylor',
  url: 'https://github.com/TheLinc',
  sameAs: ['https://github.com/TheLinc'],
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }} />

      {/* Nav */}
      <nav className="sticky top-0 z-20 bg-[rgba(13,17,23,0.92)] backdrop-blur-2xl border-b border-border">
        <div className="max-w-[900px] mx-auto px-8 h-[58px] flex items-center justify-between max-md:px-5">
          <Link href="/" className="flex items-center gap-[9px] text-[15px] font-bold text-foreground tracking-[-0.3px]">
            <Image src="/logo.png" width={22} height={22} alt="Cover Me" />
            Cover Me
          </Link>
          <Link href="/" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">
            ← Back to home
          </Link>
        </div>
      </nav>

      <main className="max-w-[900px] mx-auto px-8 py-20 max-md:px-5">

        {/* Header */}
        <div className="mb-16 max-w-[640px]">
          <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-brand mb-4 block">
            About
          </span>
          <h1 className="text-[clamp(32px,5vw,56px)] font-extrabold tracking-[-2px] text-foreground leading-[0.95] mb-6">
            Built for job seekers who apply seriously.
          </h1>
          <p className="text-[17px] text-muted-foreground leading-[1.75]">
            Cover Me is a free, open-source Chrome extension that generates tailored, ATS-friendly cover letters from any job posting in under 5 seconds. No generic templates — every letter is built from your resume and the job&apos;s exact requirements.
          </p>
        </div>

        {/* Story */}
        <div className="grid grid-cols-[1fr_280px] gap-16 mb-20 max-lg:grid-cols-1">
          <div className="space-y-5 text-[15px] text-muted-foreground leading-[1.85]">
            <h2 className="text-[22px] font-bold text-foreground tracking-[-0.5px]">
              Why Cover Me exists
            </h2>
            <p>
              Writing cover letters is the most time-consuming part of a job search — and the part that matters most. Hiring managers read them first. Applicant tracking systems scan them for keywords. A generic letter costs you the interview before your resume is even opened.
            </p>
            <p>
              Most job seekers spend 30–60 minutes per application writing and tailoring a letter. At scale — applying to dozens of roles — that&apos;s days of work. The AI tools that exist are either too generic (ChatGPT with a prompt), too expensive, or too invasive (storing your resume in systems you can&apos;t audit).
            </p>
            <p>
              Cover Me was built to solve this. One click on any job posting. Your resume, their requirements, matched in seconds. Fully editable output you actually want to send. And for users who care about privacy, a BYOK mode where your resume never leaves your device.
            </p>
            <h2 className="text-[22px] font-bold text-foreground tracking-[-0.5px] !mt-10">
              Privacy as a first principle
            </h2>
            <p>
              Your resume is PII — it contains your employment history, education, and contact details. It should not be stored on servers you haven&apos;t consented to, trained on without your knowledge, or shared with third parties.
            </p>
            <p>
              In BYOK mode, your resume and API key are encrypted on-device using AES-256-GCM via the Web Crypto API and never transmitted to Cover Me servers. In hosted mode, your resume is encrypted at rest in our database. The extension has no analytics, no telemetry, and no ads — the code is MIT licensed and auditable by anyone.
            </p>
            <h2 className="text-[22px] font-bold text-foreground tracking-[-0.5px] !mt-10">
              Open source
            </h2>
            <p>
              Cover Me is fully open source under the MIT license. The extension code, backend Edge Functions, and database schema are all public on GitHub. You can read every line, self-host with your own Supabase and Stripe, or contribute a scraper for a job board we don&apos;t yet support.
            </p>
            <p>
              Open source is a trust signal, not just a philosophy. When you can read the code that handles your resume, you don&apos;t have to take anyone&apos;s word for how it works.
            </p>
          </div>

          {/* Founder card */}
          <div className="space-y-5 max-lg:order-first">
            <div className="border border-border rounded-[12px] p-7 bg-surface">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#818cf8] to-[#4338ca] flex items-center justify-center text-white text-[22px] font-extrabold mb-5 select-none">
                L
              </div>
              <h3 className="text-[16px] font-bold text-foreground tracking-[-0.3px] mb-1">
                Lincoln Laylor
              </h3>
              <p className="text-[13px] text-muted-foreground mb-4">
                Founder &amp; developer
              </p>
              <p className="text-[13px] text-muted-foreground leading-[1.7] mb-5">
                Software developer based in Canada. Built Cover Me to solve a problem he ran into during his own job search — spending too long personalising cover letters that should take seconds.
              </p>
              <a
                href="https://github.com/TheLinc"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[13px] font-semibold text-brand-light hover:text-brand transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
                github.com/TheLinc
              </a>
            </div>

            {/* Stats */}
            <div className="border border-border rounded-[12px] p-7 bg-surface space-y-4">
              <h3 className="text-[12px] font-bold uppercase tracking-[0.09em] text-muted-foreground">
                By the numbers
              </h3>
              {[
                ['Under 5 sec', 'to generate a tailored letter'],
                ['MIT licensed', 'fully auditable source code'],
                ['6+ job boards', 'LinkedIn, Indeed, Greenhouse, Lever, Workday, Ashby'],
                ['0 telemetry', 'no analytics, no ads, no tracking'],
              ].map(([stat, label]) => (
                <div key={stat}>
                  <p className="text-[16px] font-bold text-foreground tracking-[-0.3px]">{stat}</p>
                  <p className="text-[12px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="border border-border rounded-[12px] p-10 bg-surface text-center">
          <h2 className="text-[22px] font-bold text-foreground tracking-[-0.5px] mb-3">
            Try Cover Me free
          </h2>
          <p className="text-[15px] text-muted-foreground mb-6 max-w-[460px] mx-auto leading-[1.7]">
            Install the Chrome extension and generate your first tailored cover letter in under a minute. No credit card, no account required for BYOK mode.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <a
              href={CHROME_STORE_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-brand text-white font-semibold text-[14px] px-5 py-2.5 rounded-[8px] hover:bg-brand/90 transition-colors"
            >
              Install free · Chrome
            </a>
            <a
              href="https://github.com/TheLinc/cover-me"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 border border-border text-foreground font-semibold text-[14px] px-5 py-2.5 rounded-[8px] hover:bg-elevated transition-colors"
            >
              View source on GitHub
            </a>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-20">
        <div className="max-w-[900px] mx-auto px-8 py-8 max-md:px-5 flex items-center justify-between text-[13px] text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">← Cover Me</Link>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/support" className="hover:text-foreground transition-colors">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
