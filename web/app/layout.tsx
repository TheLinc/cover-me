import type { Metadata } from 'next'
import './globals.css'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: {
    default: 'AI Cover Letter Generator Chrome Extension — Cover Me',
    template: '%s — Cover Me',
  },
  description: 'Cover Me is a free Chrome extension that reads any job posting and generates a tailored, ATS-friendly cover letter from your resume in under 5 seconds. Works on LinkedIn, Indeed, Greenhouse, Lever, Workday, and more.',
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
    title: 'AI Cover Letter Generator Chrome Extension — Cover Me',
    description: 'One click on any job posting. A tailored, ATS-friendly cover letter built from your resume in under 5 seconds. Free Chrome extension.',
    type: 'website',
    siteName: 'Cover Me',
    url: BASE,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Cover Letter Generator Chrome Extension — Cover Me',
    description: 'One click on any job posting. A tailored, ATS-friendly cover letter built from your resume in under 5 seconds. Free Chrome extension.',
  },
}

const jsonLdApp = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Cover Me',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Chrome',
  description: 'AI-powered Chrome extension that reads any job posting and generates a tailored, ATS-friendly cover letter from your resume in under 5 seconds.',
  url: BASE,
  offers: [
    {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      name: 'Free',
      description: '10 AI-generated cover letters per day, or unlimited with your own API key.',
    },
    {
      '@type': 'Offer',
      price: '4',
      priceCurrency: 'USD',
      name: 'Pro',
      description: 'Unlimited cover letters per day with cross-device history sync.',
      eligibleQuantity: {
        '@type': 'QuantitativeValue',
        unitText: 'month',
      },
    },
  ],
  featureList: [
    'Reads job posting automatically',
    'ATS keyword matching',
    'Resume-based personalisation',
    'Works on LinkedIn, Indeed, Greenhouse, Lever, Workday, Ashby',
    'PDF export',
    'Open source — MIT license',
  ],
  isAccessibleForFree: true,
  license: 'https://opensource.org/licenses/MIT',
}

const jsonLdOrg = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Cover Me',
  url: BASE,
  logo: `${BASE}/logo.png`,
  sameAs: [
    'https://github.com/TheLinc/cover-me',
  ],
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
  description: 'Free AI cover letter generator Chrome extension. One click on any job posting — tailored, ATS-friendly cover letter from your resume in under 5 seconds.',
}

const jsonLdHowTo = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to generate a cover letter with Cover Me',
  description: 'Generate a tailored, ATS-friendly cover letter from any job posting in under 5 seconds using the Cover Me Chrome extension.',
  totalTime: 'PT1M',
  step: [
    {
      '@type': 'HowToStep',
      name: 'Install and configure',
      text: 'Install Cover Me from the Chrome Web Store. Upload your resume (PDF or DOCX) — text is extracted locally. Choose BYOK with your own Claude or OpenAI key for unlimited free use, or sign up for 10 free hosted letters per day.',
      position: 1,
    },
    {
      '@type': 'HowToStep',
      name: 'Open a job posting',
      text: 'Navigate to any job on LinkedIn, Indeed, Greenhouse, Lever, Workday, or Ashby. Cover Me reads the page automatically. If the scraper does not catch it, paste the description manually.',
      position: 2,
    },
    {
      '@type': 'HowToStep',
      name: 'Generate, edit, and apply',
      text: 'Click Generate. Cover Me maps the job requirements to your achievements and produces a tailored letter in under 5 seconds. Edit inline, copy to clipboard, or export as PDF.',
      position: 3,
    },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdApp) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrg) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebSite) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdHowTo) }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
