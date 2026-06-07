import type { Metadata } from 'next'
import './globals.css'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://cover-me.dev'

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

const jsonLd = {
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
