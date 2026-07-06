// Guide metadata shared by the /guides index, sitemap, and article pages.
export const GUIDES = [
  {
    slug: 'what-is-an-ats-score',
    title: 'What is an ATS score?',
    description: 'How applicant tracking systems score and filter resumes, what a good match score looks like, and how to improve yours before you apply.',
    date: '2026-07-06',
  },
  {
    slug: 'cover-me-vs-chatgpt',
    title: 'Cover Me vs ChatGPT for cover letters',
    description: 'What a purpose-built extension does that a general chatbot can’t: auto-reading postings, grounding letters in your resume, and matching ATS keywords.',
    date: '2026-07-06',
  },
  {
    slug: 'tailor-resume-to-job-description',
    title: 'How to tailor your resume to a job description',
    description: 'A step-by-step method for matching your resume to a specific role — which keywords matter, what to rewrite, and what never to fabricate.',
    date: '2026-07-06',
  },
] as const

export type Guide = (typeof GUIDES)[number]

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'

export function getGuide(slug: string): Guide {
  const guide = GUIDES.find((g) => g.slug === slug)
  if (!guide) throw new Error(`Unknown guide slug: ${slug}`)
  return guide
}

export function guideArticleJsonLd(guide: Guide, image?: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.description,
    ...(image ? { image: [`${BASE}${image}`] } : {}),
    datePublished: guide.date,
    dateModified: guide.date,
    url: `${BASE}/guides/${guide.slug}`,
    mainEntityOfPage: `${BASE}/guides/${guide.slug}`,
    author: {
      '@type': 'Person',
      name: 'Lincoln Laylor',
      url: 'https://www.linkedin.com/in/lincolnlaylor/',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Cover Me',
      url: BASE,
      logo: { '@type': 'ImageObject', url: `${BASE}/logo.png` },
    },
  }
}

export function guideBreadcrumbJsonLd(guide: Guide) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'Guides', item: `${BASE}/guides` },
      { '@type': 'ListItem', position: 3, name: guide.title, item: `${BASE}/guides/${guide.slug}` },
    ],
  }
}
