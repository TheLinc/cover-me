import { isValidElement, type ReactNode } from 'react'
import { ORG_ID } from '@/lib/structured-data'

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
    updated: '2026-11-18',
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
    slug: 'aiapply-review',
    title: 'AIApply review: is it legit, and is auto-apply worth it?',
    description: 'AIApply submits job applications for you, at $49 a month for 100. Who runs it, what its free checker did with a test resume, and what users report.',
    date: '2026-07-21',
    updated: '2026-11-19',
    image: '/guides/aiapply-review.png',
    imageAlt:
      "AIApply at a glance, checked November 19, 2026. Premium writing tools: $29 a month or $144 a year. Auto Apply: $49 a month for 100 applications, up to $199 a quarter for 750. Free: no trial, a limited free account. Trustpilot: 4.3 from 2,255 reviews. Run by AIApply Limited, registered in England and Wales in 2023.",
  },
  {
    slug: 'jobscan-review',
    title: 'Jobscan review: is it legit, and is it worth $49.95 a month?',
    description: "Jobscan gives 5 free scans a month, then costs $49.95 a month. What its match rate measures, what users on Trustpilot and Reddit say, and who should pay for it.",
    date: '2026-10-29',
    updated: '2026-11-19',
    image: '/guides/jobscan-review.png',
    imageAlt:
      "Jobscan at a glance, checked November 19, 2026. Free: 5 resume scans a month, with an account. Premium: $49.95 a month, or $89.95 every 3 months after a 7-day trial that bills automatically. Trustpilot: 4.2 from 348 reviews. Run by Jobscan in Seattle, started in 2013.",
  },
  {
    slug: 'teal-review',
    title: 'Is Teal legit? A Teal review for job seekers',
    description: "Teal is a real company with its own job board, resume builder and job tracker. Where its job listings come from, what Teal+ costs, and what users say.",
    date: '2026-10-29',
    updated: '2026-11-19',
    image: '/guides/teal-review.png',
    imageAlt:
      "Teal at a glance, checked November 19, 2026. Company: Teal Labs, Inc. in Miami, founded 2019, $19 million raised. Job board: yes, with listings from employers' own hiring systems, and Apply goes to the employer's site. Teal+: $13 every 7 days, $29 every 30 days or $79 every 90 days. Trustpilot: 4.3 from 120 reviews.",
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
    description: 'Rezi is an AI resume builder, with Pro at $29 a month or Lifetime at $149 once. Cover Me tailors the resume you already have to each posting, with a free plan or Pro at $15 a month.',
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
  {
    slug: 'chatgpt-resume-prompts',
    title: 'ChatGPT resume prompts to tailor your resume to a job',
    description: 'Four prompts that tailor your resume to a job posting in ChatGPT or Claude: pull the keywords, rewrite the summary and bullets, and check nothing was made up. Each one tested, with the real answer.',
    date: '2026-11-18',
    image: '/guides/chatgpt-resume-prompts.png',
    imageAlt:
      "The fourth prompt asks the chatbot to check its rewrite against the original resume. Claude found it had tied 38% more qualified leads to the $1.2M paid media budget, when the resume credits the 38% to email and social campaigns.",
  },
  {
    slug: 'chatgpt-cover-letter-prompts',
    title: 'ChatGPT cover letter prompts that drop the AI phrases',
    description: 'Four prompts that write a cover letter in ChatGPT or Claude from your resume and the posting, strip the phrases that sound AI-written, and check every claim. Each one tested, with the real answer.',
    date: '2026-11-18',
    image: '/guides/chatgpt-cover-letter-prompts.png',
    imageAlt:
      "ChatGPT's first draft says \"I'm excited by the opportunity to help drive product growth through coordinated, measurable demand generation programs.\" After the prompt that strips AI phrases, the line reads \"I'm interested in helping build campaigns that connect product initiatives with measurable lead growth and marketing performance.\" Then the check prompt takes out \"global marketing\", which isn't on the resume.",
  },
  {
    slug: 'jobright-review',
    title: 'Jobright review: is it legit, and is Turbo worth paying for?',
    description: "Jobright is a real Santa Clara company with a free job board and a paid Turbo plan. What Turbo costs, what users report on Trustpilot and Reddit, and how it compares with Simplify.",
    date: '2026-11-21',
    image: '/guides/jobright-review.png',
    imageAlt:
      "Jobright at a glance, checked November 21, 2026. Free: job matches and tracking, with 2 AI resumes a day. Turbo: $29.99 a month on a timed offer, $49.99 crossed out, shown only after sign-in. Trustpilot: 4.8 from 3,811 reviews, with recent ones invited by Jobright. Run by Jobright Inc. in Santa Clara, founded in 2023, $7.7 million raised.",
  },
  {
    slug: 'how-to-answer-job-application-questions',
    title: 'How to answer job application questions, with sample answers',
    description: 'What the employer checks for in "Why are you interested in this position?", "Why do you want to work here?", tell us about yourself, desired salary and reason for leaving, with a sample answer for each.',
    date: '2026-11-23',
    image: '/guides/how-to-answer-job-application-questions.png',
    imageAlt:
      'How to answer "Why are you interested in this position?" on an application. Take one line from the posting, such as owning campaign strategy across email and social with a $1.2M budget, and one result from your resume, such as growing qualified leads 38% in one year. The sample answer starts: This role puts campaign strategy and the paid budget with one person, and that\'s the part of my work I want more of.',
  },
  {
    slug: 'workday-application-status',
    title: 'What your Workday application status means',
    description: "What Submitted, In Progress, Completed and Withdrew mean on a Workday application, why Completed usually means you weren't selected, and what to do at each status. From HR guides and Workday's own manual.",
    date: '2026-11-23',
    image: '/guides/workday-application-status.png',
    imageAlt:
      "Workday application statuses and what they usually mean. Submitted, on the Active tab: the employer has it, in the first review. In Progress, on the Active tab: still being considered, at review, interview or assessment. Completed, on the Inactive tab: the process ended for you, usually not selected or a canceled job. From UW–Madison HR and Workday's recruiting manual, November 2026.",
  },
  {
    slug: 'careerflow-review',
    title: 'Careerflow review: is it legit, and is Premium worth paying for?',
    description: "Careerflow is a real 2022 company with a resume builder, job tracker and LinkedIn optimizer. What Premium costs, what its free plan leaves out, what users report on Reddit and Trustpilot, and how it compares with Teal.",
    date: '2026-11-24',
    image: '/guides/careerflow-review.png',
    imageAlt:
      "Careerflow at a glance, checked November 24, 2026. Free: 1 resume, 10 tracked jobs and a LinkedIn score, no AI cover letters. Premium: $23.99 a month or $8.99 a week, and the weekly plan is never refunded. Trustpilot: 3.8 from 20 reviews, 8 of them from its freelance data workers. Run by Careerflow Inc., founded in 2022, Techstars class of 2023.",
  },
  {
    slug: 'ats-resume-template',
    title: 'ATS resume template: a free Word file tested in 4 ATSs',
    description: 'A free one-column Word resume template with placeholder text, no sign-up. Read correctly by Lever, Workday, Ashby and SmartRecruiters, tested November 24, 2026.',
    date: '2026-11-24',
    image: '/guides/ats-resume-template.png',
    imageAlt:
      "The top of the free ATS resume template in Word: Your Name centered over a contact line, then Summary, Experience and Education headings with placeholder text and bullets. Below it, checks for Lever, Workday, Ashby and SmartRecruiters. Free .docx, no sign-up, tested November 24, 2026.",
  },
  {
    slug: 'best-free-ats-resume-checkers',
    title: 'Best free ATS resume checkers (2026), compared',
    description: "Eight free ATS resume checkers run on the same made-up resume, which lacked 4 of the posting's keywords. Which ones found them, what each free plan hid, and the free limits of eleven, checked November 27, 2026.",
    date: '2026-11-27',
    image: '/guides/best-free-ats-resume-checkers.png',
    imageAlt:
      "How many of the 4 missing keywords each free ATS checker found on the same made-up resume, tested November 27, 2026. Resume Worded, Rezi and Cover Me: 4 of 4. Jobscan, SkillSyncer and ResyMatch: 3 of 4, all missing Gainsight. Enhancv: 2 shown on the free plan. Teal: 0 shown on the free plan.",
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
  if (isValidElement<{ children?: ReactNode; prompt?: string; answer?: string; check?: ReactNode }>(node)) {
    const { children, prompt, answer, check } = node.props
    return textOf([children, prompt, answer, check])
  }
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
      '@id': ORG_ID,
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
