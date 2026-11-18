import { isValidElement, type ReactNode } from 'react'

export type Guide = {
  slug: string
  title: string
  description: string
  date: string
  // Only real content changes bump this: it drives dateModified and the sitemap's lastmod (#88).
  updated?: string
  image: string
  imageAlt: string
}

export const GUIDES: Guide[] = [
  {
    slug: 'what-is-an-ats-score',
    title: 'What is an ATS score?',
    description: 'What an ATS score measures, how applicant tracking systems filter resumes, what counts as a good match, and how Cover Me calculates its score.',
    date: '2026-07-06',
    updated: '2026-10-29',
    image: '/guides/what-is-an-ats-score.png',
    imageAlt:
      "Diagram of an 86 ATS match score for a Marketing Manager posting at Northwind, a sample company. Four of five must-have keywords are covered (SEO, Campaign strategy, Google Analytics and Budget management) and HubSpot is missing, for 56 of 70 points. All three nice-to-have keywords are covered, for 30 of 30.",
  },
  {
    slug: 'cover-me-vs-chatgpt',
    title: 'Cover Me vs ChatGPT for cover letters',
    description: 'ChatGPT can write a good cover letter if you paste in the posting and your resume every time. Cover Me reads the posting when you click, keeps your resume, and checks the output against it.',
    date: '2026-07-06',
    updated: '2026-10-29',
    image: '/guides/cover-me-vs-chatgpt.png',
    imageAlt:
      "Comparison of the steps for each application. In a chatbot: copy the posting into a chat, paste or upload your resume, ask for a tailored resume, ask again for a cover letter, then fix, format and export a PDF. In Cover Me: click Tailor Resume to Job on the posting, then Generate Cover Letter, and get a tailored resume, a cover letter and an ATS score.",
  },
  {
    slug: 'tailor-resume-to-job-description',
    title: 'How to tailor your resume to a job description',
    description: 'A five-step method for matching your resume to one posting: find the must-have keywords, use the posting\'s wording where it is true, rewrite the right bullets, and never add skills you lack.',
    date: '2026-07-06',
    updated: '2026-11-07',
    image: '/guides/tailor-resume-to-job-description.png',
    imageAlt:
      "Example of tailoring a resume to a job posting. The posting asks for campaign strategy, a budget and SEO. Two resume bullets are rewritten in the posting's words and keep their real results, 38% more leads and 64% more organic traffic. HubSpot, which the resume doesn't mention, is left off.",
  },
  {
    slug: 'cover-me-vs-aiapply',
    title: 'Cover Me vs AIApply for job applications',
    description: 'AIApply submits applications for you with paid credits. Cover Me writes a tailored resume and cover letter for the posting you have open, and you review and send it yourself.',
    date: '2026-07-21',
    updated: '2026-10-29',
    image: '/guides/cover-me-vs-aiapply.png',
    imageAlt:
      "Comparison of how applications go out. AIApply: buy auto-apply credits, the AI writes the application, and it submits for you. Cover Me: click Tailor Resume to Job on a posting, read and edit the resume and letter, and submit it yourself.",
  },
  {
    slug: 'cover-me-vs-jobscan',
    title: 'Cover Me vs Jobscan: a free, open-source alternative',
    description: 'Jobscan gives 5 free resume scans a month, then costs $49.95 a month. Cover Me tailors your resume, scores it and writes a cover letter on the posting, free with your own API key or $15 a month.',
    date: '2026-10-29',
    image: '/guides/cover-me-vs-jobscan.png',
    imageAlt:
      "Table comparing Jobscan and Cover Me, with prices from each company's site in October 2026. Free plan: 5 resume scans a month with Jobscan, and unlimited with your own API key, or 10 to start then 5 a week, with Cover Me. Paid plan: $49.95 a month or $89.95 every 3 months, against $15 a month or $35 every 3 months. AI cover letters: paid plans against every plan. Open source: no against yes, MIT.",
  },
  {
    slug: 'cover-me-vs-teal',
    title: 'Cover Me vs Teal: a cheaper Teal+ alternative',
    description: 'Teal is a resume builder and job tracker, with Teal+ at $29 every 30 days. Cover Me tailors the resume you already have to each posting, free with your own API key or $15 a month.',
    date: '2026-10-29',
    updated: '2026-11-07',
    image: '/guides/cover-me-vs-teal.png',
    imageAlt:
      "Table comparing Teal and Cover Me, with prices from each company's site in October 2026. Built for: building resumes and tracking jobs, against tailoring your resume and letter to each posting. Free AI cover letters: 2 credits, against unlimited with your own API key, or 10 to start then 5 a week. Paid plan: $13 a week, $29 every 30 days or $79 every 90 days, against $15 a month or $35 every 3 months. Open source: no against yes, MIT.",
  },
  {
    slug: 'use-your-own-api-key-for-cover-letters',
    title: 'How to use your own OpenAI or Claude API key for cover letters',
    description: 'Cover Me writes cover letters and tailors resumes with your own API key: unlimited, no account, and your resume goes only to Anthropic or OpenAI. Setup, models and trade-offs.',
    date: '2026-10-29',
    updated: '2026-11-09',
    image: '/guides/use-your-own-api-key-for-cover-letters.png',
    imageAlt:
      "Diagram of Cover Me with your own API key. Your resume and API key stay in your browser, with the key stored encrypted, and go straight to your AI provider, Anthropic or OpenAI, using Claude Sonnet 5.5 or GPT-6.1 Sol. Cover Me's server never receives your resume or key. Optionally, a copy of the job page, not your resume, goes to Cover Me's server to read the posting.",
  },
  {
    slug: 'ats-friendly-resume-format',
    title: 'How to make your resume ATS friendly: I tested 6 formats in 4 ATSs',
    description: 'One resume in six formats, uploaded to Lever, Workday, Ashby and SmartRecruiters. Workday read nothing from an image PDF, Ashby cut a link out of a two-column design, and SmartRecruiters mixed skills into a degree from a table.',
    date: '2026-10-31',
    image: '/guides/ats-friendly-resume-format.png',
    imageAlt:
      "Results table for one made-up resume saved in six formats and uploaded to the resume autofill of Lever, Workday, Ashby and SmartRecruiters. All four read the one-column PDF, the one-column Word file and the Word file with contact details in the header. The two-column design made Ashby cut off the LinkedIn link. The table layout made SmartRecruiters mix skills into the degree. The image-only PDF gave Workday nothing, while the other three read it.",
  },
  {
    slug: 'cover-me-vs-rezi',
    title: 'Cover Me vs Rezi: tailor the resume you already have',
    description: 'Rezi is an AI resume builder, with Pro at $29 a month or Lifetime at $149 once. Cover Me tailors the resume you already have to each posting, free with your own API key or $15 a month.',
    date: '2026-11-07',
    image: '/guides/cover-me-vs-rezi.png',
    imageAlt:
      "Table comparing Rezi and Cover Me, with prices from each company's site in November 2026. Built for: building a resume in Rezi's templates, against tailoring the resume you already have to each posting. Free plan: 1 resume and 3 PDF downloads, against unlimited with your own API key, or 10 to start then 5 a week. Paid plan: $29 a month or $149 once, against $15 a month or $35 every 3 months. Open source: no against yes, MIT.",
  },
  {
    slug: 'tailor-resume-in-word',
    title: 'How to tailor your resume in Word without losing its formatting',
    description: 'Change the words inside the paragraphs your resume already has, and leave the paragraphs alone. What breaks a Word design, how to tailor by hand, and a tested run with Cover Me.',
    date: '2026-11-07',
    image: '/guides/tailor-resume-in-word.png',
    imageAlt:
      "A made-up Word resume for Alex Rivera after Cover Me tailored it to a sample Marketing Manager posting. The serif name, teal section rules, square bullets and right-aligned dates are the same as in the original file; the profile, bullets and skills line are rewritten. Labels read fonts kept, words rewritten and layout kept.",
  },
  {
    slug: 'free-jobscan-alternatives',
    title: 'Free Jobscan alternatives: 6 resume checkers compared',
    description: "Jobscan's free plan gives 5 scans a month, and rewriting and cover letters cost $49.95 a month. Six tools that check your resume against a job posting for free, and which ones also rewrite it.",
    date: '2026-11-09',
    image: '/guides/free-jobscan-alternatives.png',
    imageAlt:
      "Table of free Jobscan alternatives, from each company's site in November 2026. Free check against a job posting: Cover Me, 10 to start then 5 a week; SkillSyncer, 2 scans a week; Teal, the top 5 keywords; Resume Worded, a partial report; Jobscan, 5 scans a month. Free rewrite and cover letter: Cover Me, both; SkillSyncer, rewrites with weekly AI credits; Teal, 2 cover letters once; Resume Worded and Jobscan, paid plans only.",
  },
]

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'

export function getGuide(slug: string): Guide {
  const guide = GUIDES.find((g) => g.slug === slug)
  if (!guide) throw new Error(`Unknown guide slug: ${slug}`)
  return guide
}

export function newestFirst<T extends Pick<Guide, 'date' | 'updated'>>(guides: T[]): T[] {
  return guides.toSorted((a, b) => (b.updated ?? b.date).localeCompare(a.updated ?? a.date) || b.date.localeCompare(a.date))
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join(' ')
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children)
  return ''
}

export function readingMinutes(node: ReactNode): number {
  const words = textOf(node).split(/\s+/).filter((w) => /[a-z0-9]/i.test(w)).length
  return Math.max(1, Math.ceil(words / 230))
}

export function guideArticleJsonLd(guide: Guide) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.description,
    image: [`${BASE}${guide.image}`],
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
