import type { Metadata } from 'next'
import { CHROME_STORE_URL } from '@/lib/utils'
import { SiteNav } from '@/components/site/SiteNav'
import { SiteFooter } from '@/components/site/SiteFooter'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'

const TITLE = 'About Cover Me: Open-Source Resume Tailor by Lincoln Laylor'
const DESCRIPTION = 'Cover Me is an open-source Chrome extension by Lincoln Laylor that tailors your resume and writes a cover letter for the job posting you have open. Why he built it, how it handles your data, and where the code lives.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: `${BASE}/about` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${BASE}/about`,
    siteName: 'Cover Me',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
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
  url: 'https://www.linkedin.com/in/lincolnlaylor/',
  sameAs: [
    'https://github.com/TheLinc',
    'https://www.linkedin.com/in/lincolnlaylor/',
  ],
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }} />

      <SiteNav />

      <main className="max-w-[900px] mx-auto px-8 py-20 max-md:px-5">

        {/* Header */}
        <div className="mb-16 max-w-[640px]">
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2 mb-4 block">
            About
          </span>
          <h1 className="text-[clamp(32px,5vw,56px)] text-foreground leading-[0.95] mb-4">
            Built after 300 applications and no interviews.
          </h1>
          <p className="text-[12px] text-muted-foreground mb-5">
            <time dateTime="2026-10-29">Last updated October 29, 2026</time>
          </p>
          <p className="text-[17px] text-muted-foreground leading-[1.75]">
            Cover Me (cover-me.dev) is an open-source Chrome extension that tailors your resume and writes a cover letter for the job posting you have open. Lincoln Laylor, a software developer in Canada, builds it. It reads postings on LinkedIn, Indeed, Greenhouse, Lever, Workday and Ashby, shows an ATS match score with the keywords you&apos;re missing, and removes any skill your original resume doesn&apos;t support. It&apos;s free with your own OpenAI or Claude API key. Cover Me isn&apos;t related to the CoverMe AI project on GitHub.
          </p>
        </div>

        {/* Story */}
        <div className="grid grid-cols-[1fr_280px] gap-16 mb-20 max-lg:grid-cols-1">
          <div className="space-y-5 text-[15px] text-muted-foreground leading-[1.85]">
            <h2 className="text-[22px] text-foreground">
              Why Cover Me exists
            </h2>
            <p>
              For three months I applied to about 300 software developer roles and didn&apos;t get a single interview. I was sending the same resume to every posting.
            </p>
            <p>
              So I started tailoring each application with ChatGPT. It helped, but every application took about 12 minutes. I pasted the posting, uploaded my resume, explained my background again in every new chat, and kept hitting the free plan&apos;s upload limit. It also added skills I don&apos;t have because the posting asked for them, so I had to check every line before sending.
            </p>
            <p>
              The tools built for this cost more than I wanted to pay while unemployed, and most were resume builders with templates. I only needed my own resume rewritten for each posting, plus a cover letter to match. So I built that.
            </p>
            <p>
              In the month after I started using Cover Me, I got 4 interviews, while applying to fewer jobs than before. Tailoring every application was the one thing I changed. I can&apos;t prove it did all the work, but larger data points the same way. Huntr looked at over 1.39 million applications and found{' '}
              <a href="https://huntr.co/research/job-search-trends-q2-2025" target="_blank" rel="noopener noreferrer" className="text-brand-light hover:text-brand transition-colors underline underline-offset-2">tailored resumes reached the interview stage 2.1 times as often</a>
              {' '}(5.75% against 2.68%).
            </p>
            <h2 className="text-[22px] text-foreground !mt-10">
              What Cover Me does with your resume
            </h2>
            <p>
              Your resume holds your work history, education and contact details, so here is exactly where it goes.
            </p>
            <p>
              With your own API key, you need no account. Your resume goes only to the AI provider whose key you added, OpenAI or Anthropic, and never to Cover Me. The key is stored in the browser, encrypted with AES-256-GCM through the Web Crypto API. The key that encrypts it is stored beside it, so this stops casual reads of the storage file but not someone with full access to your Chrome profile.
            </p>
            <p>
              With a Cover Me account, your resume is encrypted at rest in our database and sent to Anthropic only to read it and write your documents. It&apos;s never sold or used to train AI models. The extension has no ads, analytics or tracking.
            </p>
            <h2 className="text-[22px] text-foreground !mt-10">
              Open source
            </h2>
            <p>
              Cover Me is open source under the MIT license. The extension, the backend Edge Functions and the database schema are public on GitHub. You can read how your resume is handled, self-host with your own Supabase and Stripe accounts, or add a scraper for a job board it doesn&apos;t support yet.
            </p>
            <p>
              Every privacy claim on this page can be checked in the code, so you don&apos;t have to take my word for it.
            </p>
            {/* Open Source Alternatives and Toolradar check for these badges during review. Plain imgs: the images live on their hosts. */}
            <div className="flex flex-wrap items-center gap-4">
              <a href="https://www.opensourcealternatives.to" className="inline-block">
                <img src="https://www.opensourcealternatives.to/badge-osa.svg" alt="As seen on Open Source Alternatives" width={270} height={20} />
              </a>
              <a href="https://toolradar.com/tools/cover-me" target="_blank" rel="noopener" className="inline-block">
                <img src="https://toolradar.com/api/badge/cover-me?type=review&style=light&v=5" alt="Cover Me on Toolradar" width={280} height={80} />
              </a>
            </div>
          </div>

          {/* Founder card */}
          <div className="space-y-5 max-lg:order-first">
            <div className="border border-border rounded-[12px] p-7 bg-surface">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand to-brand-strong flex items-center justify-center text-white text-[22px] font-extrabold mb-5 select-none">
                L
              </div>
              <h3 className="text-[16px] font-bold text-foreground tracking-[-0.3px] mb-1">
                Lincoln Laylor
              </h3>
              <p className="text-[13px] text-muted-foreground mb-4">
                Founder &amp; developer
              </p>
              <p className="text-[13px] text-muted-foreground leading-[1.7] mb-5">
                Software developer based in Canada. Built Cover Me during his own job search, after three months of applications with no interviews.
                {' '}
                <a
                  href="https://dev.to/plain-stack/how-i-went-from-0-interviews-to-4-in-a-month-by-tailoring-every-application-1an4"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-light hover:text-brand transition-colors underline underline-offset-2"
                >
                  He wrote up how it went on DEV.
                </a>
              </p>
              <div className="flex flex-col gap-2.5">
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
                <a
                  href="https://www.linkedin.com/in/lincolnlaylor/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[13px] font-semibold text-brand-light hover:text-brand transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  linkedin.com/in/lincolnlaylor
                </a>
              </div>
            </div>

            {/* Stats */}
            <div className="border border-border rounded-[12px] p-7 bg-surface space-y-4">
              <h3 className="text-[12px] font-bold uppercase tracking-[0.09em] text-muted-foreground">
                By the numbers
              </h3>
              {[
                ['About 20 sec', 'for a cover letter, about 30 with a tailored resume'],
                ['MIT licensed', 'extension, backend and schema on GitHub'],
                ['6 job boards', 'LinkedIn, Indeed, Greenhouse, Lever, Workday, Ashby, plus paste from any site'],
                ['0 telemetry', 'in the extension: no analytics, no ads, no tracking'],
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
          <h2 className="text-[22px] text-foreground mb-3">
            Try Cover Me free
          </h2>
          <p className="text-[15px] text-muted-foreground mb-6 max-w-[460px] mx-auto leading-[1.7]">
            Install the Chrome extension, add your resume, and tailor it to the job posting you have open. No credit card, and no account if you use your own API key.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <a
              href={CHROME_STORE_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-brand-strong text-white font-semibold text-[14px] px-5 py-2.5 rounded-[8px] hover:bg-brand-deep transition-colors"
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

      <SiteFooter />
    </div>
  )
}
