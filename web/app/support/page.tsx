import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'

export const metadata: Metadata = {
  title: 'Help & Support — Cover Me AI Cover Letter & Resume Tailor',
  description: 'Get help with Cover Me. Find answers to common questions about the AI cover letter and resume tailor Chrome extension, API keys, daily limits, and resume storage.',
  alternates: { canonical: `${BASE}/support` },
  openGraph: {
    title: 'Help & Support — Cover Me AI Cover Letter & Resume Tailor',
    description: 'Get help with Cover Me. Find answers to common questions about the AI cover letter and resume tailor Chrome extension, API keys, daily limits, and resume storage.',
    url: `${BASE}/support`,
    siteName: 'Cover Me',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Help & Support — Cover Me AI Cover Letter & Resume Tailor',
    description: 'Get help with Cover Me. Find answers to common questions about the AI cover letter and resume tailor Chrome extension.',
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

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'The extension isn\'t scraping the job description — what do I do?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Click the Cover Me icon, scroll down, and use "Paste job description manually" to paste the text directly. This works on any page.',
      },
    },
    {
      '@type': 'Question',
      name: 'I hit my daily cover letter limit. When does it reset?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Free accounts get 10 cover letters per day. The limit resets at midnight UTC. Upgrade to Cover Me Pro for unlimited generations.',
      },
    },
    {
      '@type': 'Question',
      name: 'My API key isn\'t working. How do I fix it?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Make sure you\'ve selected the correct provider (Claude or OpenAI) in Settings and that your key has available credits.',
      },
    },
    {
      '@type': 'Question',
      name: 'Where is my resume stored?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'BYOK users: your resume is stored locally on your device only and never sent to Cover Me servers. Hosted accounts: your resume is encrypted at rest in our database using AES-256-GCM — it is never shared or used for AI training.',
      },
    },
  ],
}

const SUPPORT_EMAIL = 'support@cover-me.dev'
const GITHUB_ISSUES = 'https://github.com/TheLinc/cover-me/issues'

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="Cover Me" width={26} height={26} className="rounded-md" />
            <span className="font-bold text-[15px] tracking-[-0.3px]">Cover Me</span>
          </Link>
          <nav className="flex items-center gap-6 text-[13px] text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-20">

        {/* Heading */}
        <div className="mb-14">
          <h1 className="text-[36px] font-bold tracking-[-0.8px] text-foreground mb-2">
            Support
          </h1>
          <p className="text-[12px] text-muted-foreground mb-3">
            <time dateTime="2026-06-23">Last updated June 23, 2026</time>
          </p>
          <p className="text-[16px] text-muted-foreground leading-[1.7]">
            Having trouble with Cover Me? We&apos;re here to help.
          </p>
        </div>

        {/* Cards */}
        <div className="space-y-5">

          {/* Email */}
          <div className="border border-border rounded-[12px] p-7 bg-surface">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-[10px] bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-brand-light">
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[16px] font-bold text-foreground tracking-[-0.3px] mb-1">
                  Email support
                </h2>
                <p className="text-[14px] text-muted-foreground leading-[1.7] mb-4">
                  For account issues, billing questions, or anything else — send us an email and we&apos;ll get back to you within one business day.
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
              <div className="w-10 h-10 rounded-[10px] bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-brand-light">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[16px] font-bold text-foreground tracking-[-0.3px] mb-1">
                  Bug reports &amp; feature requests
                </h2>
                <p className="text-[14px] text-muted-foreground leading-[1.7] mb-4">
                  Cover Me is open source. If you&apos;ve found a bug or have a feature idea, open an issue on GitHub — it&apos;s the fastest way to get it tracked and fixed.
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
            <h2 className="text-[16px] font-bold text-foreground tracking-[-0.3px] mb-5">
              Common questions
            </h2>
            <div className="space-y-5">
              {[
                {
                  q: 'The extension isn\'t scraping the job description',
                  a: 'Click the Cover Me icon, scroll down, and use "Paste job description manually" to paste the text directly.',
                },
                {
                  q: 'I hit my daily limit',
                  a: 'Free accounts get 10 cover letters per day. The limit resets at midnight UTC. Upgrade to Pro for unlimited generations.',
                },
                {
                  q: 'My API key isn\'t working',
                  a: 'Make sure you\'ve selected the correct provider (Claude or OpenAI) in Settings and that your key has available credits.',
                },
                {
                  q: 'Where is my resume stored?',
                  a: 'BYOK users: locally on your device only. Hosted accounts: encrypted at rest in our database — it is never shared or used for training.',
                },
              ].map(({ q, a }) => (
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
    </div>
  )
}
