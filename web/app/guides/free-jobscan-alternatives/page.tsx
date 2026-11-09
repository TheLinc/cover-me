import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { CHROME_STORE_URL } from '@/lib/utils'
import { getGuide, guideArticleJsonLd, guideBreadcrumbJsonLd } from '@/lib/guides'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'
const guide = getGuide('free-jobscan-alternatives')
const HERO_IMAGE = '/guides/free-jobscan-alternatives.png'
const HERO_ALT =
  "Table of free Jobscan alternatives, from each company's site in November 2026. Free check against a job posting: Cover Me, 10 to start then 5 a week; SkillSyncer, 2 scans a week; Teal, the top 5 keywords; Resume Worded, a partial report; Jobscan, 5 scans a month. Free rewrite and cover letter: Cover Me, both; SkillSyncer, rewrites with weekly AI credits; Teal, 2 cover letters once; Resume Worded and Jobscan, paid plans only."
const LINK = 'text-brand-light hover:text-brand transition-colors'

export const metadata: Metadata = {
  title: { absolute: 'Free Jobscan Alternatives: 6 Resume Checkers Compared (2026)' },
  description: 'Jobscan gives 5 free scans a month. Six free alternatives that check your resume against a job posting, and which ones also rewrite it or write the cover letter.',
  alternates: { canonical: `${BASE}/guides/${guide.slug}` },
  openGraph: {
    title: 'Free Jobscan alternatives | Cover Me',
    description: 'Six tools that check your resume against a job posting for free, and which ones also rewrite it or write the cover letter.',
    url: `${BASE}/guides/${guide.slug}`,
    siteName: 'Cover Me',
    type: 'article',
    images: [{ url: `${BASE}${HERO_IMAGE}`, width: 1600, height: 900, alt: 'Free Jobscan alternatives compared on free job posting checks, rewrites and cover letters' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Jobscan alternatives | Cover Me',
    description: 'Six tools that check your resume against a job posting for free, and which ones also rewrite it or write the cover letter.',
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
        text: 'Yes. SkillSyncer, Teal, Resume Worded, Enhancv and Resume.io all check a resume against a job description for free, with different limits. Cover Me also rewrites your resume for the posting and writes a cover letter on its free plan: 10 generations to start, then 5 a week.',
      },
    },
    {
      '@type': 'Question',
      name: 'Which free tool rewrites my resume for a job posting?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Cover Me and SkillSyncer. Cover Me rewrites your bullets, summary and skills in one click, within its free generations. SkillSyncer's free plan has 10 AI credits a week, and a full rewrite costs 5. Jobscan and Resume Worded keep AI rewriting on paid plans, and Enhancv's checker only suggests changes.",
      },
    },
    {
      '@type': 'Question',
      name: 'Do match scores mean the same thing in every tool?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "No. Each tool counts keywords its own way, so the same resume gets a different number in each one, and none of them is the score an employer's applicant tracking system shows a recruiter. The list of missing keywords is more useful than the number.",
      },
    },
    {
      '@type': 'Question',
      name: 'Is there an unlimited free option?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Cover Me is unlimited with your own OpenAI or Claude API key, and no account is needed. You pay the AI provider for what you use.',
      },
    },
  ],
}

const TOOLS: { name: string; check: string; rewrite: string; letter: string; runs: string }[] = [
  { name: 'Cover Me', check: 'ATS score out of 100 with every missing keyword; 10 generations to start, then 5 a week', rewrite: 'Yes, in one click', letter: 'Yes', runs: 'Chrome extension, on the posting you have open' },
  { name: 'SkillSyncer', check: '2 job match scans a week', rewrite: 'Yes, with 10 AI credits a week', letter: 'No', runs: 'Web app' },
  { name: 'Teal', check: 'Top 5 keywords from a posting', rewrite: '5 AI bullets, once', letter: '2, once', runs: 'Web app, plus an extension that saves jobs' },
  { name: 'Resume Worded', check: 'Part of the Targeted Resume report', rewrite: 'Paid plans only', letter: 'No', runs: 'Web app' },
  { name: 'Enhancv checker', check: 'Missing skills and keywords when you paste a job', rewrite: 'Suggestions only', letter: 'No', runs: 'Web app' },
  { name: 'Resume.io checker', check: 'A match score when you paste a job, with an email', rewrite: 'Not stated', letter: 'No', runs: 'Web app' },
  { name: 'Jobscan', check: '5 resume scans a month', rewrite: 'Paid plans only', letter: 'Paid plans only', runs: 'Web app, plus an extension that saves jobs' },
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
          Free Jobscan alternatives: 6 resume checkers compared
        </h1>
        <p className="text-[12px] text-muted-foreground">
          <time dateTime={guide.updated ?? guide.date}>Updated November 9, 2026</time> · Lincoln Laylor
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
          Jobscan&rsquo;s free plan gives you 5 resume scans a month. Rewriting your resume and writing cover letters need a paid plan, at $49.95 a month or $89.95 every 3 months. Six other tools check your resume against a job posting for free. Cover Me (cover-me.dev) is the one that also rewrites the resume and writes the cover letter on its free plan.
        </p>
        <p>
          I build Cover Me, so weigh this list with that in mind. The other tools&rsquo; limits and prices are from their own pricing and help pages, checked on November 9, 2026. Free plans change often, so check one before you rely on it.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">Free Jobscan alternatives at a glance</h2>
        <p className="text-[13px]">What each free plan gives you for one job posting, from each company&rsquo;s site in November 2026.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[13.5px] border border-border rounded-[8px] overflow-hidden" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className="bg-elevated">
                <th className="text-left px-4 py-3 font-bold text-muted-foreground border-b border-border">Tool</th>
                <th className="text-left px-4 py-3 font-bold text-muted-foreground border-b border-border">Free check against a posting</th>
                <th className="text-left px-4 py-3 font-bold text-muted-foreground border-b border-border">Free rewrite</th>
                <th className="text-left px-4 py-3 font-bold text-muted-foreground border-b border-border">Free cover letter</th>
                <th className="text-left px-4 py-3 font-bold text-muted-foreground border-b border-border">Where it runs</th>
              </tr>
            </thead>
            <tbody>
              {TOOLS.map((row, i) => (
                <tr key={row.name} className={i % 2 === 0 ? 'bg-surface' : 'bg-elevated'}>
                  <td className={`px-4 py-3 font-medium border-b border-border ${row.name === 'Cover Me' ? 'text-brand-light' : 'text-foreground'}`}>{row.name}</td>
                  <td className="px-4 py-3 text-muted-foreground border-b border-border">{row.check}</td>
                  <td className="px-4 py-3 text-muted-foreground border-b border-border">{row.rewrite}</td>
                  <td className="px-4 py-3 text-muted-foreground border-b border-border">{row.letter}</td>
                  <td className="px-4 py-3 text-muted-foreground border-b border-border">{row.runs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="text-[22px] text-foreground !mt-10">1. Cover Me: rewrites the resume and writes the letter for free</h2>
        <p>
          Cover Me is a Chrome extension that works on the job posting you have open on <Link href="/for/linkedin" className={LINK}>LinkedIn</Link>, <Link href="/for/indeed" className={LINK}>Indeed</Link>, <Link href="/for/greenhouse" className={LINK}>Greenhouse</Link>, <Link href="/for/lever" className={LINK}>Lever</Link>, <Link href="/for/workday" className={LINK}>Workday</Link> or <Link href="/for/ashby" className={LINK}>Ashby</Link>, or on a posting you paste in. One click rewrites your bullets, summary and skills in the posting&rsquo;s words and shows an <Link href="/guides/what-is-an-ats-score" className={LINK}>ATS score</Link> out of 100 with every keyword you&rsquo;re still missing. Another click writes a matching cover letter. A check removes any skill your original resume doesn&rsquo;t support, so the score never goes up because of something you haven&rsquo;t done.
        </p>
        <p>
          The free account gives 10 generations to start, then 5 a week, with no credit card. Pro is $15 a month for up to 25 a day. Every job you generate for also goes on a simple board of each application&rsquo;s stage. Cover Me has no resume builder or LinkedIn profile review, and it doesn&rsquo;t apply for you.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">2. SkillSyncer: the most free scans</h2>
        <p>
          SkillSyncer&rsquo;s free plan gives 2 job match scans a week and 10 AI credits a week, with no card needed. A full AI rewrite costs 5 credits, so the credits cover about two rewrites a week, and you approve each suggestion before it&rsquo;s applied. It&rsquo;s a web app: you upload or build your resume and paste the job description. Paid plans start at $14.95 a month, or $34.86 every 3 months. It has no cover letter tool.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">3. Teal: free job tracking with a keyword check</h2>
        <p>
          Teal&rsquo;s free plan has unlimited resumes and job tracking. On the free plan, its Job Matcher shows the top five keywords from a job description, and Teal+ shows the rest. Free AI is a one-time set of credits: 5 for bullets, 2 for summaries and 2 for cover letters. Teal+ is $13 every 7 days, $29 every 30 days or $79 every 90 days. A free Chrome extension saves jobs from job boards to your tracker. <Link href="/guides/cover-me-vs-teal" className={LINK}>Cover Me vs Teal</Link> compares the two in more detail.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">4. Resume Worded: a relevancy score for one job</h2>
        <p>
          Resume Worded&rsquo;s Targeted Resume tool scores your resume against one job description, and the site says a score below 80 means important skills are missing. A free account shows part of the report. The full report and the AI bullet writer are on Pro, at $49 a month, $99 every 3 months or $229 a year. It also reviews LinkedIn profiles.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">5. Enhancv resume checker: a free check with an optional job description</h2>
        <p>
          Enhancv&rsquo;s free checker runs 27 checks on a PDF or Word resume up to 2 MB. Paste a job description and it adds which of the job&rsquo;s skills and keywords you have and which you&rsquo;re missing. Without one, it gives a general score. It suggests changes but doesn&rsquo;t rewrite the resume. It also flags things a recruiter might hold against you, such as employment gaps.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">6. Resume.io resume checker: a match score with only an email</h2>
        <p>
          Resume.io&rsquo;s free checker runs 16 checks on your resume. Paste a job and it gives two scores, one for how complete your resume is and one for how well it matches the role. You enter an email to see the results, but you don&rsquo;t need an account. Its paid resume builder starts with a 7-day trial.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">Is Jobscan&rsquo;s free plan enough?</h2>
        <p>
          For a few important applications, it can be. The free plan includes 5 scans a month, and a rescan after you edit your resume counts as a new scan, so fixing one resume for one job can use several. If you apply to more than a handful of jobs a month, or want the rewrite done for you, you&rsquo;ll hit the limit quickly. <Link href="/guides/cover-me-vs-jobscan" className={LINK}>Cover Me vs Jobscan</Link> compares its paid plan with Cover Me&rsquo;s.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">Which one should you use?</h2>
        <p>
          If you only want a score and a list of missing keywords to fix by hand, SkillSyncer gives the most free scans, and Enhancv and Resume.io let you paste a job into a free checker. If you&rsquo;re tracking a lot of applications in one place, Teal&rsquo;s free tracker is the strongest. If you want each resume rewritten for the posting and a cover letter written to match, Cover Me does both on its free plan. Whichever you use, change only what&rsquo;s true: the <Link href="/guides/tailor-resume-to-job-description" className={LINK}>guide to tailoring your resume</Link> shows how.
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
        <h2 className="text-[20px] text-foreground mb-2">Tailor your resume on the posting, free</h2>
        <p className="text-[14px] text-muted-foreground mb-5 max-w-[420px] mx-auto leading-[1.7]">
          A free account gets 10 generations to start, then 5 a week. No credit card required.
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
