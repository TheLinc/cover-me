import type { Metadata } from 'next'
import './globals.css'
import { jsonLdOrg, jsonLdWebSite } from '@/lib/structured-data'
import { Geist, Geist_Mono } from 'next/font/google'

const sans = Geist({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' })

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'

const TITLE = 'Cover Me: AI Resume Tailor and Cover Letter Chrome Extension'
const DESCRIPTION = 'Tailor your resume to the job description, write a matching cover letter and answer job application questions, with an ATS match score. Free plan to start.'

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
    'resume tailoring Chrome extension',
    'ATS resume checker',
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

// Homepage-only JSON-LD is added in app/page.tsx: markup must describe the page it's on, https://developers.google.com/search/docs/appearance/structured-data/sd-policies

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Browser extensions add attributes to <html> before React hydrates (#32)
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrg) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebSite) }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
