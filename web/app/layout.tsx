import type { Metadata } from 'next'
import './globals.css'
import { CHROME_STORE_URL } from '@/lib/utils'
import { Geist, Geist_Mono } from 'next/font/google'

const sans = Geist({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' })

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'

const TITLE = 'Cover Me: AI Resume Tailor and Cover Letter Generator'
const DESCRIPTION = 'Open-source Chrome extension that tailors your resume and writes a cover letter for any job posting, with an ATS match score. Free with your own API key.'

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: {
    default: TITLE,
    template: '%s | Cover Me',
  },
  description: DESCRIPTION,
  keywords: [
    'AI cover letter generator',
    'AI resume tailor',
    'cover letter generator Chrome extension',
    'cover letter from job posting',
    'ATS match score',
    'open source cover letter generator',
    'cover letter generator with your own API key',
    'cover letter generator free',
  ],
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: BASE,
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    siteName: 'Cover Me',
    url: BASE,
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
}

const jsonLdOrg = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Cover Me',
  url: BASE,
  logo: `${BASE}/logo.png`,
  sameAs: [
    'https://github.com/TheLinc/cover-me',
    'https://github.com/TheLinc',
    'https://www.linkedin.com/in/lincolnlaylor/',
    CHROME_STORE_URL,
    'https://alternativeto.net/software/cover-me/about/',
    'https://toolradar.com/tools/cover-me',
  ],
  founder: {
    '@type': 'Person',
    name: 'Lincoln Laylor',
    url: 'https://www.linkedin.com/in/lincolnlaylor/',
  },
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'support@cover-me.dev',
    contactType: 'customer support',
  },
}

const jsonLdWebSite = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Cover Me',
  url: BASE,
  description: 'Cover Me is an open-source Chrome extension that tailors your resume and writes a cover letter for the job posting you have open, on LinkedIn, Indeed, Greenhouse, Lever, Workday and Ashby.',
}

// SoftwareApplication, HowTo, and Speakable JSON-LD live in lib/structured-data.ts
// and render on the homepage only — schema should describe the page it's on.

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning covers only this element's own attributes: browser
    // extensions add some to <html> before React hydrates.
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrg) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebSite) }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
