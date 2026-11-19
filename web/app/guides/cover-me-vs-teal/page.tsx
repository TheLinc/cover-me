import type { Metadata } from 'next'
import Link from 'next/link'
import { ComparisonTable, GuideArticle } from '@/components/site/GuideArticle'
import { getGuide } from '@/lib/guides'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'
const guide = getGuide('cover-me-vs-teal')

export const metadata: Metadata = {
  title: { absolute: 'Cover Me vs Teal: A Cheaper Teal+ Alternative' },
  description: "Teal builds resumes and tracks jobs, with Teal+ at $29 every 30 days. Cover Me tailors your resume to each posting, free with your own key or $15 a month.",
  alternates: { canonical: `${BASE}/guides/${guide.slug}` },
  openGraph: {
    title: 'Cover Me vs Teal | Cover Me',
    description: 'A cheaper Teal+ alternative that tailors your resume and writes your cover letter on the posting.',
    url: `${BASE}/guides/${guide.slug}`,
    siteName: 'Cover Me',
    type: 'article',
    images: [{ url: `${BASE}${guide.image}`, width: 1600, height: 900, alt: 'Teal and Cover Me compared on what each is built for, free cover letters, paid plans and open source' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cover Me vs Teal | Cover Me',
    description: 'A cheaper Teal+ alternative that tailors your resume and writes your cover letter on the posting.',
    images: [`${BASE}${guide.image}`],
  },
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Is there a cheaper alternative to Teal+ for resume tailoring?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Cover Me Pro is $15 a month or $35 every 3 months, against Teal+ at $29 every 30 days or $79 every 90 days. Cover Me is also free and unlimited with your own OpenAI or Claude API key, where you pay the AI provider for what you use, or free for 10 generations to start, then 5 a week.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does Cover Me have a resume builder or job tracker like Teal?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Not like Teal's. Cover Me starts from the resume you already have and tailors it to each posting. Every Cover Me account tracks the jobs it generates for on a simple board, by stage, and Pro saves every letter and tailored resume to the account, but it has no resume builder, template gallery, contacts or follow-ups. Upload a Word resume and the tailored Word file keeps your own design (beta). Teal's free plan includes a resume builder and unlimited job tracking.",
      },
    },
    {
      '@type': 'Question',
      name: 'How many free AI cover letters do Teal and Cover Me give?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Teal's free plan includes 2 AI cover letter credits, and Teal+ makes them unlimited. Cover Me's hosted free plan gives 10 generations to start, then 5 a week, shared between letters and tailored resumes, and it's unlimited with your own API key.",
      },
    },
  ],
}

const COMPARISON: { feature: string; coverMe: string; them: string }[] = [
  { feature: 'Built for', coverMe: 'Tailoring your existing resume and writing a letter for each posting', them: 'Building resumes and tracking your job search' },
  { feature: 'Free plan', coverMe: 'Unlimited with your own API key, or 10 generations to start, then 5 a week', them: 'Unlimited resumes and job tracking, 10 templates, top 5 keywords per job, and AI credits: 5 bullets, 2 summaries, 2 cover letters' },
  { feature: 'Paid plan', coverMe: '$15 a month, or $35 every 3 months, for up to 25 generations a day', them: 'Teal+ at $13 every 7 days, $29 every 30 days or $79 every 90 days' },
  { feature: 'Where it runs', coverMe: 'Chrome extension, on the job posting you have open', them: 'Web app, plus a Chrome extension that saves jobs to its tracker' },
  { feature: 'Tailoring', coverMe: 'One click rewrites your bullets, summary and skills in the posting’s words', them: 'Keyword matching highlights the posting’s keywords while you edit; AI writes bullets and summaries' },
  { feature: 'Match score', coverMe: 'ATS score from 0 to 100 with every missing keyword listed', them: 'Keyword insights for the job you attach' },
  { feature: 'Invented skills', coverMe: 'A check removes skills your original resume does not support', them: 'Not described on its pricing page' },
  { feature: 'Templates and design', coverMe: 'Keeps your own Word design (beta), or a standard one-column layout; download as PDF or Word', them: 'Resume templates and Design Mode' },
  { feature: 'Open source', coverMe: 'Yes, MIT licensed', them: 'No' },
]

export default function Page() {
  return (
    <GuideArticle
      guide={guide}
      lede={
        <>
          Teal is a resume builder and job tracker, with Teal+ at $29 every 30 days for unlimited AI and keyword matching. Cover Me (cover-me.dev) is an open-source Chrome extension that tailors the resume you already have to the posting you have open, scores it and writes a cover letter. It&rsquo;s free with your own API key, or $15 a month.
        </>
      }
      tldr={[
        "Teal is a resume builder and job tracker. Teal+ costs $29 every 30 days for unlimited AI and keyword matching.",
        "Cover Me tailors the resume you already have to the posting you have open, scores it and writes the cover letter.",
        "Cover Me has a free plan, and Pro is $15 a month. Teal's free plan has unlimited job tracking.",
      ]}
      intro={
        <p>
          I build Cover Me, so weigh this comparison with that in mind. Teal prices and features are from its pricing page, checked in October 2026.
        </p>
      }
      sections={[
        {
          title: 'What is the difference between Cover Me and Teal?',
          body: (
            <>
              <p>
                Teal is where you build and manage your resumes and your job search. You write resumes in its builder with templates and Design Mode, keep a version for each role, and track applications, contacts and companies. When you attach a job description, Teal highlights the posting&rsquo;s keywords so you can work them in, and its AI writes bullets, summaries and cover letters. Its Chrome extension saves job listings to the tracker.
              </p>
              <p>
                Cover Me skips the builder. You upload your resume once, open a posting on <Link href="/for/linkedin">LinkedIn</Link>, <Link href="/for/indeed">Indeed</Link>, <Link href="/for/greenhouse">Greenhouse</Link>, <Link href="/for/lever">Lever</Link>, <Link href="/for/workday">Workday</Link> or <Link href="/for/ashby">Ashby</Link>, and click Tailor Resume to Job. It rewrites your bullets, summary and skills in the posting&rsquo;s words, shows an <Link href="/guides/what-is-an-ats-score">ATS score</Link> with every missing keyword, and writes a matching cover letter when you click Generate Cover Letter. You edit the result and download it as a PDF or Word file.
              </p>
            </>
          ),
        },
        {
          title: 'Feature comparison',
          body: (
            <>
              <ComparisonTable name="Teal" rows={COMPARISON} caption="Teal details are from its pricing page, checked October 2026." />
            </>
          ),
        },
        {
          title: 'How much do Teal+ and Cover Me Pro cost?',
          body: (
            <p>
              Teal+ costs $13 every 7 days, $29 every 30 days or $79 every 90 days. Cover Me Pro costs $15 a month or $35 every 3 months, for up to 25 generations a day, with every letter and tailored resume saved to your account. With your own OpenAI or Claude API key, Cover Me is free and unlimited, and you pay the AI provider for what you use. Without a key, the hosted free plan gives 10 generations to start, then 5 a week.
            </p>
          ),
        },
        {
          title: 'When is Teal the better choice?',
          body: (
            <p>
              When you need to build a resume, not just adapt one. Teal&rsquo;s builder, templates and Design Mode help if your resume needs a new layout, and its free job tracker is useful if you want your whole search, contacts and follow-up emails in one place. Its free plan does a lot without paying.
            </p>
          ),
        },
        {
          title: 'When is Cover Me the better choice?',
          body: (
            <p>
              When your resume is already in good shape and the work is adapting it to every posting. Cover Me does that from the posting page in one click, instead of you editing toward highlighted keywords. Before you see a tailored resume, a check removes any skill or claim your original resume doesn&rsquo;t support, so nothing goes out that you can&rsquo;t back up in an interview. The code is MIT licensed on{' '}
              <a href="https://github.com/TheLinc/cover-me" target="_blank" rel="noopener noreferrer">GitHub</a>, and the two work together: Teal to build and track, Cover Me to tailor each application.
            </p>
          ),
        },
      ]}
      faq={faqJsonLd}
      cta={{
        title: 'Tailor your resume on the posting',
        body: 'Free with your own API key, or 10 hosted generations to start, then 5 a week. No credit card required.',
      }}
    />
  )
}
