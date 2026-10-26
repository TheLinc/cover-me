import { CHROME_STORE_URL } from '@/lib/utils'

export const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'

// Mirror of the live Chrome Web Store rating — update when reviews change.
// Displayed in the hero and marked up in SoftwareApplication.aggregateRating;
// the two must always match the store listing.
export const STORE_RATING = { value: 5, count: 3 }

export const EXTENSION_VERSION = '1.3.1'

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
      description: '10 AI generations to start, then 5 a week, or unlimited with your own API key.',
    },
    {
      '@type': 'Offer',
      price: '15',
      priceCurrency: 'USD',
      name: 'Pro',
      description: 'Up to 25 generations a day, every application saved and searchable, $15/month or $35 every 3 months.',
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
    'Reads the job posting when you click',
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
  description: 'Generate a tailored, ATS-friendly cover letter from any job posting in about 20 seconds using the Cover Me Chrome extension.',
  totalTime: 'PT1M',
  step: [
    {
      '@type': 'HowToStep',
      name: 'Install and configure',
      text: 'Install Cover Me from the Chrome Web Store. Upload your resume (PDF or DOCX) — text is extracted locally. Choose BYOK with your own Claude or OpenAI key for unlimited free use, or sign up for 10 free hosted generations to start.',
      position: 1,
    },
    {
      '@type': 'HowToStep',
      name: 'Open a job posting',
      text: 'Open any job on LinkedIn, Indeed, Greenhouse, Lever, Workday, or Ashby, click the Cover Me icon and choose Generate. Cover Me reads the posting when you click. If it can\'t read it, paste the description.',
      position: 2,
    },
    {
      '@type': 'HowToStep',
      name: 'Generate, edit, and apply',
      text: 'Click Generate. Cover Me maps the job requirements to your achievements and produces a tailored letter in about 20 seconds. Edit inline, copy to clipboard, or export as PDF.',
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
