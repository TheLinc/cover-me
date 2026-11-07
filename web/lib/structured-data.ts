import { CHROME_STORE_URL } from '@/lib/utils'

export const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'

// Mirror of the live Chrome Web Store rating — update when reviews change.
// Displayed in the hero and marked up in SoftwareApplication.aggregateRating;
// the two must always match the store listing.
export const STORE_RATING = { value: 5, count: 3 }

// The homepage's preview image, for pages that have none of their own.
export const OG_IMAGE = { url: `${BASE}/opengraph-image`, width: 1200, height: 630, alt: 'Cover Me: tailor your resume to any job posting' }

// `version` is the newest published release (getLatestVersion). Left out when
// GitHub can't be read, rather than naming a stale version.
export const jsonLdApp = (version: string | null) => ({
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Cover Me',
  applicationCategory: 'BusinessApplication',
  applicationSubCategory: 'Browser Extension',
  operatingSystem: 'Windows, macOS, Linux, ChromeOS',
  ...(version ? { softwareVersion: version } : {}),
  description: "Open-source Chrome extension that reads the job posting you have open, tailors your resume to it, writes a matching cover letter and scores the ATS keyword match. A check removes skills your original resume doesn't support.",
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
      description: 'Up to 25 generations a day, every letter and tailored resume saved to your account, $15/month or $35 every 3 months.',
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
    'Works on LinkedIn, Indeed, Greenhouse, Lever, Workday, Ashby, BambooHR, Workable',
    'Cover letter and tailored resume download as PDF, the resume also as Word; a Word upload keeps its own design (beta)',
    "Removes skills and claims the original resume doesn't support",
    'Free and unlimited with your own OpenAI or Claude API key, no account needed',
    'Open source under the MIT license',
  ],
  isAccessibleForFree: true,
  license: 'https://opensource.org/licenses/MIT',
})

export const jsonLdHowTo = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to generate a cover letter with Cover Me',
  description: 'Generate a tailored cover letter and resume for a job posting with the Cover Me Chrome extension.',
  totalTime: 'PT1M',
  step: [
    {
      '@type': 'HowToStep',
      name: 'Install and configure',
      text: 'Install Cover Me from the Chrome Web Store. Upload your resume as a PDF, DOCX or TXT file, and the text is pulled out on your device. Add your own Claude or OpenAI key for unlimited free use with no account, or sign up for a free account with 10 generations to start.',
      position: 1,
    },
    {
      '@type': 'HowToStep',
      name: 'Open a job posting',
      text: 'Open any job on LinkedIn, Indeed, Greenhouse, Lever, Workday, Ashby, BambooHR or Workable, click the Cover Me icon and choose Generate. Cover Me reads the posting when you click. If it can\'t read it, paste the description.',
      position: 2,
    },
    {
      '@type': 'HowToStep',
      name: 'Generate, edit, and apply',
      text: 'Cover Me matches the job requirements to your experience and writes the letter. Edit it in place, copy it, or export it as a PDF.',
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
