import type { Metadata } from 'next'
import './globals.css'
import { CHROME_STORE_URL } from '@/lib/utils'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: {
    default: 'AI Cover Letter & Resume Tailor — Cover Me Chrome Extension',
    template: '%s — Cover Me',
  },
  description: 'Free Chrome extension. One click on any job posting — AI writes your cover letter and rewrites your resume with the exact ATS keywords the role demands. Works on LinkedIn, Indeed, Greenhouse, Lever, Workday, and more.',
  keywords: [
    'AI cover letter generator',
    'cover letter generator Chrome extension',
    'cover letter from job posting',
    'ATS cover letter generator',
    'cover letter generator free',
    'AI cover letter writer',
    'cover letter Chrome extension',
    'cover letter generator from resume',
  ],
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: BASE,
  },
  openGraph: {
    title: 'AI Cover Letter & Resume Tailor — Cover Me Chrome Extension',
    description: 'One click on any job posting — AI writes your cover letter and rewrites your resume with the exact ATS keywords the role demands. Free Chrome extension.',
    type: 'website',
    siteName: 'Cover Me',
    url: BASE,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Cover Letter & Resume Tailor — Cover Me Chrome Extension',
    description: 'One click on any job posting — AI writes your cover letter and rewrites your resume with the exact ATS keywords the role demands. Free Chrome extension.',
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
  description: 'Free AI cover letter generator Chrome extension. One click on any job posting — tailored, ATS-friendly cover letter from your resume in under 10 seconds.',
}

// SoftwareApplication, HowTo, and Speakable JSON-LD live in lib/structured-data.ts
// and render on the homepage only — schema should describe the page it's on.

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrg) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebSite) }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
