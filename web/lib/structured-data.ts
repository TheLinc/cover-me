import { CHROME_STORE_URL } from '@/lib/utils'

export const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'

// Mirror of the live Chrome Web Store rating — update when reviews change.
// Displayed in the hero and marked up in SoftwareApplication.aggregateRating;
// the two must always match the store listing.
export const STORE_RATING = { value: 5, count: 3 }

export const EXTENSION_VERSION = '1.2.0'

export const jsonLdApp = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Cover Me',
  applicationCategory: 'BusinessApplication',
  applicationSubCategory: 'Browser Extension',
  operatingSystem: 'Windows, macOS, Linux, ChromeOS',
  softwareVersion: EXTENSION_VERSION,
  description: 'AI-powered Chrome extension that reads any job posting and generates a tailored cover letter and rewrites your resume with ATS keywords — in seconds.',
  url: BASE,
  installUrl: CHROME_STORE_URL,
  downloadUrl: CHROME_STORE_URL,
  screenshot: `${BASE}/opengraph-image`,
  author: {
    '@type': 'Person',
    name: 'Lincoln Laylor',
    url: 'https://www.linkedin.com/in/lincolnlaylor/',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: STORE_RATING.value,
    ratingCount: STORE_RATING.count,
    bestRating: 5,
    worstRating: 1,
  },
  offers: [
    {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      name: 'Free',
      description: '5 AI-generated cover letters per day, or unlimited with your own API key.',
    },
    {
      '@type': 'Offer',
      price: '8',
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
    'AI cover letter generation from job posting',
    'AI resume tailoring with ATS keyword matching',
    'ATS match score and gap analysis',
    'Reads job posting automatically',
    'Works on LinkedIn, Indeed, Greenhouse, Lever, Workday, Ashby',
    'PDF export for cover letter and tailored resume',
    'Open source — MIT license',
  ],
  isAccessibleForFree: true,
  license: 'https://opensource.org/licenses/MIT',
}

export const jsonLdHowTo = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to generate a cover letter with Cover Me',
  description: 'Generate a tailored, ATS-friendly cover letter from any job posting in under 10 seconds using the Cover Me Chrome extension.',
  totalTime: 'PT1M',
  step: [
    {
      '@type': 'HowToStep',
      name: 'Install and configure',
      text: 'Install Cover Me from the Chrome Web Store. Upload your resume (PDF or DOCX) — text is extracted locally. Choose BYOK with your own Claude or OpenAI key for unlimited free use, or sign up for 5 free hosted letters per day.',
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
      text: 'Click Generate. Cover Me maps the job requirements to your achievements and produces a tailored letter in under 10 seconds. Edit inline, copy to clipboard, or export as PDF.',
      position: 3,
    },
  ],
}

export const jsonLdSpeakable = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  speakable: {
    '@type': 'SpeakableSpecification',
    cssSelector: ['h1', 'h2', 'h3'],
  },
  url: BASE,
}
