import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { CHROME_STORE_URL } from '@/lib/utils'
import { getGuide, guideArticleJsonLd, guideBreadcrumbJsonLd } from '@/lib/guides'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'
const guide = getGuide('cover-me-vs-teal')
const HERO_IMAGE = '/guides/cover-me-vs-teal.png'
const HERO_ALT =
  "Table comparing Teal and Cover Me, with prices from each company's site in October 2026. Built for: building resumes and tracking jobs, against tailoring your resume and letter to each posting. Free AI cover letters: 2 credits, against unlimited with your own API key, or 10 to start then 5 a week. Paid plan: $13 a week, $29 every 30 days or $79 every 90 days, against $15 a month or $35 every 3 months. Open source: no against yes, MIT."

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
    images: [{ url: `${BASE}${HERO_IMAGE}`, width: 1600, height: 900, alt: 'Teal and Cover Me compared on what each is built for, free cover letters, paid plans and open source' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cover Me vs Teal | Cover Me',
    description: 'A cheaper Teal+ alternative that tailors your resume and writes your cover letter on the posting.',
    images: [`${BASE}${HERO_IMAGE}`],
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
        text: "No. Cover Me starts from the resume you already have and tailors it to each posting. It keeps a history of your letters and tailored resumes, and Pro saves every application to a searchable dashboard, but it has no templates, resume builder or job tracking board. Teal's free plan includes a resume builder and unlimited job tracking.",
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

const COMPARISON: { feature: string; coverMe: string; teal: string }[] = [
  { feature: 'Built for', coverMe: 'Tailoring your existing resume and writing a letter for each posting', teal: 'Building resumes and tracking your job search' },
  { feature: 'Free plan', coverMe: 'Unlimited with your own API key, or 10 generations to start, then 5 a week', teal: 'Unlimited resumes and job tracking, 10 templates, top 5 keywords per job, and AI credits: 5 bullets, 2 summaries, 2 cover letters' },
  { feature: 'Paid plan', coverMe: '$15 a month, or $35 every 3 months, for up to 25 generations a day', teal: 'Teal+ at $13 every 7 days, $29 every 30 days or $79 every 90 days' },
  { feature: 'Where it runs', coverMe: 'Chrome extension, on the job posting you have open', teal: 'Web app, plus a Chrome extension that saves jobs to its tracker' },
  { feature: 'Tailoring', coverMe: 'One click rewrites your bullets, summary and skills in the posting’s words', teal: 'Keyword matching highlights the posting’s keywords while you edit; AI writes bullets and summaries' },
  { feature: 'Match score', coverMe: 'ATS score from 0 to 100 with every missing keyword listed', teal: 'Keyword insights for the job you attach' },
  { feature: 'Invented skills', coverMe: 'A check removes skills your original resume does not support', teal: 'Not described on its pricing page' },
  { feature: 'Templates and design', coverMe: 'Not included, PDF export only', teal: 'Resume templates and Design Mode' },
  { feature: 'Open source', coverMe: 'Yes, MIT licensed', teal: 'No' },
]

export default function Page() {
  return (
    <main className="max-w-[760px] mx-auto px-8 py-20 max-md:px-5">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(guideArticleJsonLd(guide, HERO_IMAGE)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(guideBreadcrumbJsonLd(guide)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <div className="mb-12">
        <Link href="/guides" className="text-[12px] font-semibold text-brand-light hover:text-brand transition-colors">
          ← All guides
        </Link>
        <h1 className="text-[clamp(30px,4.5vw,46px)] text-foreground leading-[1.02] mt-4 mb-4">
          Cover Me vs Teal: a cheaper Teal+ alternative
        </h1>
        <p className="text-[12px] text-muted-foreground">
          <time dateTime={guide.updated ?? guide.date}>Updated October 29, 2026</time> · Lincoln Laylor
        </p>
      </div>

      {/* Hero graphic */}
      <div className="mb-10 h-px bg-line" />
      <figure className="mb-12">
        <Image
          src={HERO_IMAGE}
          alt={HERO_ALT}
          width={1600}
          height={900}
          priority
          sizes="(max-width: 800px) 100vw, 760px"
          className="w-full h-auto rounded-[12px] border border-border"
        />
      </figure>

      <article className="space-y-5 text-[15.5px] text-muted-foreground leading-[1.85]">
        <p className="text-[17px] text-foreground font-medium leading-[1.7]">
          Teal is a resume builder and job tracker, with Teal+ at $29 every 30 days for unlimited AI and keyword matching. Cover Me (cover-me.dev) is an open-source Chrome extension that tailors the resume you already have to the posting you have open, scores it and writes a cover letter. It&rsquo;s free with your own API key, or $15 a month.
        </p>
        <p>
          I build Cover Me, so weigh this comparison with that in mind. Teal prices and features are from its pricing page, checked in October 2026.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">What is the difference between Cover Me and Teal?</h2>
        <p>
          Teal is where you build and manage your resumes and your job search. You write resumes in its builder with templates and Design Mode, keep a version for each role, and track applications, contacts and companies. When you attach a job description, Teal highlights the posting&rsquo;s keywords so you can work them in, and its AI writes bullets, summaries and cover letters. Its Chrome extension saves job listings to the tracker.
        </p>
        <p>
          Cover Me skips the builder. You upload your resume once, open a posting on <Link href="/for/linkedin" className="text-brand-light hover:text-brand transition-colors">LinkedIn</Link>, <Link href="/for/indeed" className="text-brand-light hover:text-brand transition-colors">Indeed</Link>, <Link href="/for/greenhouse" className="text-brand-light hover:text-brand transition-colors">Greenhouse</Link>, <Link href="/for/lever" className="text-brand-light hover:text-brand transition-colors">Lever</Link>, <Link href="/for/workday" className="text-brand-light hover:text-brand transition-colors">Workday</Link> or <Link href="/for/ashby" className="text-brand-light hover:text-brand transition-colors">Ashby</Link>, and click Tailor Resume to Job. It rewrites your bullets, summary and skills in the posting&rsquo;s words, shows an <Link href="/guides/what-is-an-ats-score" className="text-brand-light hover:text-brand transition-colors">ATS score</Link> with every missing keyword, and writes a matching cover letter when you click Generate Cover Letter. You edit the result and download it as a PDF.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">Feature comparison</h2>
        <p className="text-[13px]">Teal details are from its pricing page, checked October 2026.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[13.5px] border border-border rounded-[8px] overflow-hidden" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className="bg-elevated">
                <th className="text-left px-4 py-3 font-bold text-muted-foreground border-b border-border">Feature</th>
                <th className="text-left px-4 py-3 font-bold text-brand-light border-b border-border">Cover Me</th>
                <th className="text-left px-4 py-3 font-bold text-muted-foreground border-b border-border">Teal</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, i) => (
                <tr key={row.feature} className={i % 2 === 0 ? 'bg-surface' : 'bg-elevated'}>
                  <td className="px-4 py-3 font-medium text-foreground border-b border-border">{row.feature}</td>
                  <td className="px-4 py-3 text-muted-foreground border-b border-border">{row.coverMe}</td>
                  <td className="px-4 py-3 text-muted-foreground border-b border-border">{row.teal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="text-[22px] text-foreground !mt-10">How much do Teal+ and Cover Me Pro cost?</h2>
        <p>
          Teal+ costs $13 every 7 days, $29 every 30 days or $79 every 90 days. Cover Me Pro costs $15 a month or $35 every 3 months, for up to 25 generations a day with every application saved and searchable on your dashboard. With your own OpenAI or Claude API key, Cover Me is free and unlimited, and you pay the AI provider for what you use. Without a key, the hosted free plan gives 10 generations to start, then 5 a week.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">When is Teal the better choice?</h2>
        <p>
          When you need to build a resume, not just adapt one. Teal&rsquo;s builder, templates and Design Mode help if your resume needs a new layout, and its free job tracker is useful if you want your whole search, contacts and follow-up emails in one place. Its free plan does a lot without paying.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">When is Cover Me the better choice?</h2>
        <p>
          When your resume is already in good shape and the work is adapting it to every posting. Cover Me does that from the posting page in one click, instead of you editing toward highlighted keywords. Before you see a tailored resume, a check removes any skill or claim your original resume doesn&rsquo;t support, so nothing goes out that you can&rsquo;t back up in an interview. The code is MIT licensed on{' '}
          <a href="https://github.com/TheLinc/cover-me" target="_blank" rel="noopener noreferrer" className="text-brand-light hover:text-brand transition-colors">GitHub</a>, and the two work together: Teal to build and track, Cover Me to tailor each application.
        </p>
      </article>

      {/* FAQ */}
      <section className="mt-14">
        <h2 className="text-[22px] text-foreground mb-4">Frequently asked questions</h2>
        <div className="divide-y divide-border border-t border-border">
          {(faqJsonLd.mainEntity as { name: string; acceptedAnswer: { text: string } }[]).map((item) => (
            <div key={item.name} className="py-6">
              <h3 className="text-[16px] font-bold text-foreground tracking-[-0.3px] mb-2.5">{item.name}</h3>
              <p className="text-[14px] text-muted-foreground leading-[1.8]">{item.acceptedAnswer.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="border border-border rounded-[12px] p-8 bg-surface text-center mt-14">
        <h2 className="text-[20px] text-foreground mb-2">Tailor your resume on the posting</h2>
        <p className="text-[14px] text-muted-foreground mb-5 max-w-[420px] mx-auto leading-[1.7]">
          Free with your own API key, or 10 hosted generations to start, then 5 a week. No credit card required.
        </p>
        <a
          href={CHROME_STORE_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 bg-brand-strong text-white font-semibold text-[14px] px-5 py-2.5 rounded-[8px] hover:bg-brand-deep transition-colors"
        >
          Install free · Chrome
        </a>
      </div>
    </main>
  )
}
