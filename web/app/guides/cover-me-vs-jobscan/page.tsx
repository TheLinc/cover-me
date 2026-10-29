import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { CHROME_STORE_URL } from '@/lib/utils'
import { getGuide, guideArticleJsonLd, guideBreadcrumbJsonLd } from '@/lib/guides'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'
const guide = getGuide('cover-me-vs-jobscan')
const HERO_IMAGE = '/guides/cover-me-vs-jobscan.png'
const HERO_ALT =
  "Table comparing Jobscan and Cover Me, with prices from each company's site in October 2026. Free plan: 5 resume scans a month with Jobscan, and unlimited with your own API key, or 10 to start then 5 a week, with Cover Me. Paid plan: $49.95 a month or $89.95 every 3 months, against $15 a month or $35 every 3 months. AI cover letters: paid plans against every plan. Open source: no against yes, MIT."

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
    images: [{ url: `${BASE}${HERO_IMAGE}`, width: 1600, height: 900, alt: 'Jobscan and Cover Me compared on free plans, paid plans, cover letters and open source' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cover Me vs Jobscan | Cover Me',
    description: 'A free, open-source Jobscan alternative that tailors your resume and writes your cover letter on the posting.',
    images: [`${BASE}${HERO_IMAGE}`],
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
        text: "No. Cover Me tailors your resume and writes a cover letter for one job posting at a time. Jobscan's paid plans include a LinkedIn optimizer, a job tracker and a resume builder, which Cover Me doesn't have.",
      },
    },
  ],
}

const COMPARISON: { feature: string; coverMe: string; jobscan: string }[] = [
  { feature: 'Free plan', coverMe: 'Unlimited with your own API key, or 10 generations to start, then 5 a week', jobscan: '5 resume scans a month' },
  { feature: 'Paid plan', coverMe: '$15 a month, or $35 every 3 months, for up to 25 generations a day', jobscan: '$49.95 a month, or $89.95 every 3 months after a 7-day free trial' },
  { feature: 'Where it runs', coverMe: 'Chrome extension, on the job posting you have open', jobscan: 'Web app, plus a Chrome extension that saves jobs to its tracker' },
  { feature: 'Match score', coverMe: 'ATS score from 0 to 100 with every missing keyword listed', jobscan: 'Match rate with ATS and recruiter findings' },
  { feature: 'Resume rewriting', coverMe: 'One click rewrites your bullets, summary and skills for the posting', jobscan: 'AI optimizations on paid plans' },
  { feature: 'Invented skills', coverMe: 'A check removes skills your original resume does not support', jobscan: 'Not described on its plan page' },
  { feature: 'Cover letters', coverMe: 'On every plan, written for the posting', jobscan: 'AI cover letter generator on paid plans' },
  { feature: 'LinkedIn, job tracker, resume builder', coverMe: 'Not included', jobscan: 'LinkedIn optimizer on paid plans; job tracker and resume builder on every plan' },
  { feature: 'Open source', coverMe: 'Yes, MIT licensed', jobscan: 'No' },
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
          Cover Me vs Jobscan: a free, open-source alternative
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
          Jobscan scores your resume against a job description and, on its paid plans, rewrites it and writes cover letters. It gives 5 free scans a month, then costs $49.95 a month. Cover Me (cover-me.dev) is an open-source Chrome extension that tailors your resume, scores it and writes a cover letter on the posting you have open. It&rsquo;s free and unlimited with your own API key, or $15 a month.
        </p>
        <p>
          I build Cover Me, so weigh this comparison with that in mind. Jobscan prices and features are from its plan page, checked in October 2026.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">What is the difference between Cover Me and Jobscan?</h2>
        <p>
          Jobscan is a web app built around its resume scanner. You paste or upload your resume and a job description, and it reports a match rate with findings about keywords and formatting. Paid plans add AI rewriting, a cover letter generator, a LinkedIn profile optimizer, AI job matching and a few auto-apply credits a month. Every plan includes a job tracker, a resume builder and a Chrome extension that saves job listings to the tracker.
        </p>
        <p>
          Cover Me does less and costs less. It works on the posting itself: click Tailor Resume to Job on <Link href="/for/linkedin" className="text-brand-light hover:text-brand transition-colors">LinkedIn</Link>, <Link href="/for/indeed" className="text-brand-light hover:text-brand transition-colors">Indeed</Link>, <Link href="/for/greenhouse" className="text-brand-light hover:text-brand transition-colors">Greenhouse</Link>, <Link href="/for/lever" className="text-brand-light hover:text-brand transition-colors">Lever</Link>, <Link href="/for/workday" className="text-brand-light hover:text-brand transition-colors">Workday</Link> or <Link href="/for/ashby" className="text-brand-light hover:text-brand transition-colors">Ashby</Link>, or paste a posting from anywhere else. It rewrites your bullets, summary and skills in the posting&rsquo;s words, shows an <Link href="/guides/what-is-an-ats-score" className="text-brand-light hover:text-brand transition-colors">ATS score</Link> with every missing keyword, and writes a cover letter when you click Generate Cover Letter.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">Feature comparison</h2>
        <p className="text-[13px]">Jobscan details are from its plan page, checked October 2026.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[13.5px] border border-border rounded-[8px] overflow-hidden" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className="bg-elevated">
                <th className="text-left px-4 py-3 font-bold text-muted-foreground border-b border-border">Feature</th>
                <th className="text-left px-4 py-3 font-bold text-brand-light border-b border-border">Cover Me</th>
                <th className="text-left px-4 py-3 font-bold text-muted-foreground border-b border-border">Jobscan</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, i) => (
                <tr key={row.feature} className={i % 2 === 0 ? 'bg-surface' : 'bg-elevated'}>
                  <td className="px-4 py-3 font-medium text-foreground border-b border-border">{row.feature}</td>
                  <td className="px-4 py-3 text-muted-foreground border-b border-border">{row.coverMe}</td>
                  <td className="px-4 py-3 text-muted-foreground border-b border-border">{row.jobscan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="text-[22px] text-foreground !mt-10">How do the two scores differ?</h2>
        <p>
          Both tools compare your resume with the posting&rsquo;s keywords, but they measure it differently, so a Cover Me score and a Jobscan match rate for the same resume won&rsquo;t agree. Neither is the number an employer&rsquo;s ATS shows a recruiter.
        </p>
        <p>
          Cover Me calculates its score in code. The AI only reports which of the posting&rsquo;s keywords your tailored resume covers. Must-have keywords are worth 70 points and nice-to-have keywords 30, and each unmet hard requirement, such as a license, costs 10 points, up to 25. A requirement the posting lists as &ldquo;Tableau or Power BI&rdquo; counts as covered when you have either one. The scoring code is public in{' '}
          <a href="https://github.com/TheLinc/cover-me/blob/master/extension/src/lib/ai/ats-score.ts" target="_blank" rel="noopener noreferrer" className="text-brand-light hover:text-brand transition-colors">ats-score.ts</a>.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">When is Jobscan the better choice?</h2>
        <p>
          Jobscan covers more of the job search. If you also want to rework your LinkedIn profile, track applications in one place, or build a resume from a template, its paid plan bundles those, and the free plan&rsquo;s 5 scans a month is enough to check a few important applications. Its 7-day trial lets you try the paid features before the quarterly plan bills.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">When is Cover Me the better choice?</h2>
        <p>
          When you apply to many roles and want each one tailored without the monthly cost. With your own OpenAI or Claude key there&rsquo;s no scan limit and no account, and your resume goes only to the AI provider you chose. Before you see a tailored resume, a check removes any skill or claim your original resume doesn&rsquo;t support, so a higher score never comes from invented experience. The code is MIT licensed on{' '}
          <a href="https://github.com/TheLinc/cover-me" target="_blank" rel="noopener noreferrer" className="text-brand-light hover:text-brand transition-colors">GitHub</a>, so you can check how your resume is handled.
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
        <h2 className="text-[20px] text-foreground mb-2">Score and tailor your resume on the posting</h2>
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
