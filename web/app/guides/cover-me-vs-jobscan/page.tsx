import type { Metadata } from 'next'
import Link from 'next/link'
import { ComparisonTable, GuideArticle } from '@/components/site/GuideArticle'
import { getGuide } from '@/lib/guides'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'
const guide = getGuide('cover-me-vs-jobscan')

export const metadata: Metadata = {
  title: { absolute: 'Cover Me vs Jobscan: A Free, Open-Source Alternative' },
  description: "Jobscan gives 5 free scans a month, then $49.95 a month. Cover Me tailors and scores your resume on the posting, free with your own API key or $15 a month.",
  alternates: { canonical: `${BASE}/guides/${guide.slug}` },
  openGraph: {
    title: 'Cover Me vs Jobscan | Cover Me',
    description: 'A free, open-source Jobscan alternative that tailors your resume and writes your cover letter on the posting.',
    url: `${BASE}/guides/${guide.slug}`,
    siteName: 'Cover Me',
    type: 'article',
    images: [{ url: `${BASE}${guide.image}`, width: 1600, height: 900, alt: 'Jobscan and Cover Me compared on free plans, paid plans, cover letters and open source' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cover Me vs Jobscan | Cover Me',
    description: 'A free, open-source Jobscan alternative that tailors your resume and writes your cover letter on the posting.',
    images: [`${BASE}${guide.image}`],
  },
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Is there a free alternative to Jobscan?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Yes. Cover Me is free and unlimited with your own OpenAI or Claude API key, with no account needed; you pay the AI provider for what you use. Without a key, the hosted free plan gives 10 generations to start, then 5 a week. Jobscan's own free plan gives 5 resume scans a month.",
      },
    },
    {
      '@type': 'Question',
      name: "Is Cover Me's ATS score the same as Jobscan's match rate?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: "No. Each tool measures the match its own way, so the numbers aren't comparable between tools. Cover Me's score is calculated in code: must-have keywords from the posting are worth 70 points, nice-to-have keywords 30, and each unmet hard requirement costs 10 points, up to 25. The AI only reports which keywords your tailored resume covers.",
      },
    },
    {
      '@type': 'Question',
      name: 'Does Cover Me optimize my LinkedIn profile like Jobscan?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "No. Cover Me tailors your resume and writes a cover letter for one job posting at a time. Jobscan's paid plans include a LinkedIn optimizer, a job tracker and a resume builder. Cover Me has no LinkedIn optimizer or resume builder, and its tracking is a simple board of each application's stage.",
      },
    },
  ],
}

const COMPARISON: { feature: string; coverMe: string; them: string }[] = [
  { feature: 'Free plan', coverMe: 'Unlimited with your own API key, or 10 generations to start, then 5 a week', them: '5 resume scans a month' },
  { feature: 'Paid plan', coverMe: '$15 a month, or $35 every 3 months, for up to 25 generations a day', them: '$49.95 a month, or $89.95 every 3 months after a 7-day free trial' },
  { feature: 'Where it runs', coverMe: 'Chrome extension, on the job posting you have open', them: 'Web app, plus a Chrome extension that saves jobs to its tracker' },
  { feature: 'Match score', coverMe: 'ATS score from 0 to 100 with every missing keyword listed', them: 'Match rate with ATS and recruiter findings' },
  { feature: 'Resume rewriting', coverMe: 'One click rewrites your bullets, summary and skills for the posting', them: 'AI optimizations on paid plans' },
  { feature: 'Invented skills', coverMe: 'A check removes skills your original resume does not support', them: 'Not described on its plan page' },
  { feature: 'Cover letters', coverMe: 'On every plan, written for the posting', them: 'AI cover letter generator on paid plans' },
  { feature: 'LinkedIn, job tracker, resume builder', coverMe: 'A simple board of your applications by stage; no LinkedIn optimizer or resume builder', them: 'LinkedIn optimizer on paid plans; job tracker and resume builder on every plan' },
  { feature: 'Open source', coverMe: 'Yes, MIT licensed', them: 'No' },
]

export default function Page() {
  return (
    <GuideArticle
      guide={guide}
      lede={
        <>
          Jobscan scores your resume against a job description and, on its paid plans, rewrites it and writes cover letters. It gives 5 free scans a month, then costs $49.95 a month. Cover Me (cover-me.dev) is an open-source Chrome extension that tailors your resume, scores it and writes a cover letter on the posting you have open. It&rsquo;s free and unlimited with your own API key, or $15 a month.
        </>
      }
      tldr={[
        "Jobscan scores your resume against a job description, with 5 free scans a month. Rewriting and cover letters need a paid plan, at $49.95 a month or $89.95 every 3 months.",
        "Cover Me rewrites your resume for the posting you have open, scores it and writes the cover letter. It has a free plan, and Pro is $15 a month.",
        "Jobscan also has a LinkedIn optimizer and a resume builder, which Cover Me doesn't.",
      ]}
      intro={
        <p>
          I build Cover Me, so weigh this comparison with that in mind. Jobscan prices and features are from its plan page, checked in October 2026.
        </p>
      }
      sections={[
        {
          title: 'What is the difference between Cover Me and Jobscan?',
          body: (
            <>
              <p>
                Jobscan is a web app built around its resume scanner. You paste or upload your resume and a job description, and it reports a match rate with findings about keywords and formatting. Paid plans add AI rewriting, a cover letter generator, a LinkedIn profile optimizer, AI job matching and a few auto-apply credits a month. Every plan includes a job tracker, a resume builder and a Chrome extension that saves job listings to the tracker.
              </p>
              <p>
                Cover Me does less and costs less. It works on the posting itself: click Tailor Resume to Job on <Link href="/for/linkedin">LinkedIn</Link>, <Link href="/for/indeed">Indeed</Link>, <Link href="/for/greenhouse">Greenhouse</Link>, <Link href="/for/lever">Lever</Link>, <Link href="/for/workday">Workday</Link> or <Link href="/for/ashby">Ashby</Link>, or paste a posting from anywhere else. It rewrites your bullets, summary and skills in the posting&rsquo;s words, shows an <Link href="/guides/what-is-an-ats-score">ATS score</Link> with every missing keyword, and writes a cover letter when you click Generate Cover Letter.
              </p>
            </>
          ),
        },
        {
          title: 'Feature comparison',
          body: (
            <>
              <ComparisonTable name="Jobscan" rows={COMPARISON} caption="Jobscan details are from its plan page, checked October 2026." />
            </>
          ),
        },
        {
          title: 'How do the two scores differ?',
          body: (
            <>
              <p>
                Both tools compare your resume with the posting&rsquo;s keywords, but they measure it differently, so a Cover Me score and a Jobscan match rate for the same resume won&rsquo;t agree. Neither is the number an employer&rsquo;s ATS shows a recruiter.
              </p>
              <p>
                Cover Me calculates its score in code. The AI only reports which of the posting&rsquo;s keywords your tailored resume covers. Must-have keywords are worth 70 points and nice-to-have keywords 30, and each unmet hard requirement, such as a license, costs 10 points, up to 25. A requirement the posting lists as &ldquo;Tableau or Power BI&rdquo; counts as covered when you have either one. The scoring code is public in{' '}
                <a href="https://github.com/TheLinc/cover-me/blob/master/extension/src/lib/ai/ats-score.ts" target="_blank" rel="noopener noreferrer">ats-score.ts</a>.
              </p>
            </>
          ),
        },
        {
          title: 'When is Jobscan the better choice?',
          body: (
            <p>
              Jobscan covers more of the job search. If you also want to rework your LinkedIn profile, track applications in one place, or build a resume from a template, its paid plan bundles those, and the free plan&rsquo;s 5 scans a month is enough to check a few important applications. Its 7-day trial lets you try the paid features before the quarterly plan bills.
            </p>
          ),
        },
        {
          title: 'When is Cover Me the better choice?',
          body: (
            <p>
              When you apply to many roles and want each one tailored without the monthly cost. With your own OpenAI or Claude key there&rsquo;s no scan limit and no account, and your resume goes only to the AI provider you chose. Before you see a tailored resume, a check removes any skill or claim your original resume doesn&rsquo;t support, so a higher score never comes from invented experience. The code is MIT licensed on{' '}
              <a href="https://github.com/TheLinc/cover-me" target="_blank" rel="noopener noreferrer">GitHub</a>, so you can check how your resume is handled.
            </p>
          ),
        },
      ]}
      faq={faqJsonLd}
      cta={{
        title: 'Score and tailor your resume on the posting',
        body: 'Free with your own API key, or 10 hosted generations to start, then 5 a week. No credit card required.',
      }}
    />
  )
}
