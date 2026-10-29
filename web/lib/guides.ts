// Guide metadata shared by the /guides index, sitemap, and article pages.
// `updated` marks the last real content change; it drives dateModified and lastmod.
export type Guide = {
  slug: string
  title: string
  description: string
  date: string
  updated?: string
}

export const GUIDES: Guide[] = [
  {
    slug: 'what-is-an-ats-score',
    title: 'What is an ATS score?',
    description: 'What an ATS score measures, how applicant tracking systems filter resumes, what counts as a good match, and how Cover Me calculates its score.',
    date: '2026-07-06',
    updated: '2026-10-29',
  },
  {
    slug: 'cover-me-vs-chatgpt',
    title: 'Cover Me vs ChatGPT for cover letters',
    description: 'ChatGPT can write a good cover letter if you paste in the posting and your resume every time. Cover Me reads the posting when you click, keeps your resume, and checks the output against it.',
    date: '2026-07-06',
    updated: '2026-10-29',
  },
  {
    slug: 'tailor-resume-to-job-description',
    title: 'How to tailor your resume to a job description',
    description: 'A five-step method for matching your resume to one posting: find the must-have keywords, use the posting\'s wording where it is true, rewrite the right bullets, and never add skills you lack.',
    date: '2026-07-06',
    updated: '2026-10-29',
  },
  {
    slug: 'cover-me-vs-aiapply',
    title: 'Cover Me vs AIApply for job applications',
    description: 'AIApply submits applications for you with paid credits. Cover Me writes a tailored resume and cover letter for the posting you have open, and you review and send it yourself.',
    date: '2026-07-21',
    updated: '2026-10-29',
  },
]

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
    dateModified: guide.updated ?? guide.date,
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
