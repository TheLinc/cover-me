import type { Metadata } from 'next'
import { SiteNav } from '@/components/site/SiteNav'
import { SiteFooter } from '@/components/site/SiteFooter'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'

const TITLE = 'Cover Me help and support'
const DESCRIPTION = "Help with the Cover Me Chrome extension: what to do when a job posting isn't detected, when the free allowance resets, fixing an API key, and where your resume is stored."

export const metadata: Metadata = {
  title: 'Help and support',
  description: DESCRIPTION,
  alternates: { canonical: `${BASE}/support` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${BASE}/support`,
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
    { '@type': 'ListItem', position: 2, name: 'Support', item: `${BASE}/support` },
  ],
}

// One list feeds both the visible questions and the FAQ schema, so they can't drift.
const FAQ = [
  {
    q: "Cover Me didn't read the job posting. What do I do?",
    a: "Open the Cover Me popup and click \"Can't detect the posting? Paste it manually\", then paste the job description. This works on any site.",
  },
  {
    q: 'I used my free generations. When do they reset?',
    a: 'A free account gets 10 generations to start, then 5 a week. The weekly allowance resets every Monday at 00:00 UTC. Pro allows up to 25 a day, and your own API key has no limit from Cover Me.',
  },
  {
    q: "My API key isn't working. How do I fix it?",
    a: 'In Settings, check that you picked the provider the key belongs to, Claude or OpenAI, and that the account behind the key has credit.',
  },
  {
    q: 'Where is my resume stored?',
    a: "With your own API key, your resume stays in your browser and goes only to the AI provider whose key you added, never to Cover Me. With a Cover Me account, it's kept in your browser and encrypted at rest in our database with AES-256-GCM. It's sent to Anthropic only to read it and write your documents, and it's never sold or used to train AI models.",
  },
]

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
}

const SUPPORT_EMAIL = 'support@cover-me.dev'
const GITHUB_ISSUES = 'https://github.com/TheLinc/cover-me/issues'

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <SiteNav />

      <main className="max-w-2xl mx-auto px-6 py-20">

        {/* Heading */}
        <div className="mb-14">
          <h1 className="text-[36px] text-foreground mb-2">
            Support
          </h1>
          <p className="text-[12px] text-muted-foreground mb-3">
            <time dateTime="2026-10-29">Last updated October 29, 2026</time>
          </p>
          <p className="text-[16px] text-muted-foreground leading-[1.7]">
            Answers to the most common Cover Me questions, and how to reach a person when they don&apos;t cover it.
          </p>
        </div>

        {/* Cards */}
        <div className="space-y-5">

          {/* Email */}
          <div className="border border-border rounded-[12px] p-7 bg-surface">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-[10px] bg-brand-tint border border-brand-tint flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-brand-light">
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[16px] text-foreground mb-1">
                  Email support
                </h2>
                <p className="text-[14px] text-muted-foreground leading-[1.7] mb-4">
                  Email us about your account, billing or anything else, and we&apos;ll reply within one business day.
                </p>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="inline-flex items-center gap-2 text-[13px] font-semibold text-brand-light hover:text-brand transition-colors"
                >
                  {SUPPORT_EMAIL}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 7h10v10M7 17 17 7" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* GitHub Issues */}
          <div className="border border-border rounded-[12px] p-7 bg-surface">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-[10px] bg-brand-tint border border-brand-tint flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-brand-light">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[16px] text-foreground mb-1">
                  Bug reports &amp; feature requests
                </h2>
                <p className="text-[14px] text-muted-foreground leading-[1.7] mb-4">
                  Cover Me is open source. If you&apos;ve found a bug or have a feature idea, open an issue on GitHub. That&apos;s the fastest way to get it tracked and fixed.
                </p>
                <a
                  href={GITHUB_ISSUES}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[13px] font-semibold text-brand-light hover:text-brand transition-colors"
                >
                  Open an issue on GitHub
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 7h10v10M7 17 17 7" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Common issues */}
          <div className="border border-border rounded-[12px] p-7 bg-surface">
            <h2 className="text-[16px] text-foreground mb-5">
              Common questions
            </h2>
            <div className="space-y-5">
              {FAQ.map(({ q, a }) => (
                <div key={q} className="border-t border-border pt-5 first:border-t-0 first:pt-0">
                  <p className="text-[14px] font-semibold text-foreground mb-1.5">{q}</p>
                  <p className="text-[14px] text-muted-foreground leading-[1.7]">{a}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer note */}
        <p className="text-center text-[13px] text-muted-foreground mt-14">
          Still stuck?{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand-light hover:underline">
            Email us
          </a>{' '}
          and we&apos;ll sort it out.
        </p>

      </main>
      <SiteFooter />
    </div>
  )
}
