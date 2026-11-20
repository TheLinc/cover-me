import type { Metadata } from 'next'
import Link from 'next/link'
import { GuideArticle, GuideFigure } from '@/components/site/GuideArticle'
import { getGuide } from '@/lib/guides'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'
const guide = getGuide('free-jobscan-alternatives')

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
    images: [{ url: `${BASE}${guide.image}`, width: 1600, height: 900, alt: 'Free Jobscan alternatives compared on free job posting checks, rewrites and cover letters' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Jobscan alternatives | Cover Me',
    description: 'Six tools that check your resume against a job posting for free, and which ones also rewrite it or write the cover letter.',
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
        text: 'Yes. SkillSyncer, Teal, Resume Worded, Enhancv and Resume.io all check a resume against a job description for free, with different limits. Cover Me also rewrites your resume for the posting and writes a cover letter on its free plan: 10 generations to start, then 5 a week.',
      },
    },
    {
      '@type': 'Question',
      name: 'Which free tool rewrites my resume for a job posting?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Cover Me and SkillSyncer. Cover Me rewrites your bullets, summary and skills in one click, within its free generations. SkillSyncer's free plan has 10 AI credits a week, and a full rewrite costs 5. Teal's free plan includes 5 AI bullets, once. Jobscan and Resume Worded keep AI rewriting on paid plans, and Enhancv's checker only suggests changes.",
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
    <GuideArticle
      guide={guide}
      lede={
        <>
          Jobscan&rsquo;s free plan gives you 5 resume scans a month. Rewriting your resume and writing cover letters need a paid plan, at $49.95 a month or $89.95 every 3 months. Six other tools check your resume against a job posting for free. Cover Me (cover-me.dev) also rewrites the resume and writes the cover letter on its free plan, every week rather than once.
        </>
      }
      tldr={[
        "Jobscan's free plan gives 5 scans a month. Rewriting and cover letters need a paid plan, from $49.95 a month.",
        "SkillSyncer, Teal, Resume Worded, Enhancv and Resume.io check your resume against a job posting for free, with different limits.",
        "Cover Me rewrites your resume and writes the cover letter on its free plan every week. Teal's free AI is a one-time set of credits, and SkillSyncer has no cover letter tool.",
      ]}
      intro={
        <p>
          I build Cover Me, so weigh this list with that in mind. The other tools&rsquo; limits and prices are from their own pricing and help pages, checked on November 9, 2026. Free plans change often, so check one before you rely on it.
        </p>
      }
      sections={[
        {
          title: 'Free Jobscan alternatives at a glance',
          body: (
            <GuideFigure caption="What each free plan gives you for one job posting, from each company’s site in November 2026.">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-[13.5px] bg-white border border-border rounded-[8px] overflow-hidden" style={{ borderCollapse: 'collapse' }}>
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
                    {TOOLS.map((row) => (
                      <tr key={row.name}>
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
            </GuideFigure>
          ),
        },
        {
          title: '1. Cover Me: rewrites the resume and writes the letter for free',
          body: (
            <>
              <p>
                Cover Me is a Chrome extension that works on the job posting you have open on <Link href="/for/linkedin">LinkedIn</Link>, <Link href="/for/indeed">Indeed</Link>, <Link href="/for/greenhouse">Greenhouse</Link>, <Link href="/for/lever">Lever</Link>, <Link href="/for/workday">Workday</Link> or <Link href="/for/ashby">Ashby</Link>, or on a posting you paste in. One click rewrites your bullets, summary and skills in the posting&rsquo;s words and shows an <Link href="/guides/what-is-an-ats-score">ATS score</Link> out of 100 with every keyword you&rsquo;re still missing. Another click writes a matching cover letter. A check removes any skill your original resume doesn&rsquo;t support, so the score never goes up because of something you haven&rsquo;t done.
              </p>
              <p>
                The free account gives 10 generations to start, then 5 a week, with no credit card. Pro is $15 a month for up to 25 a day. Every job you generate for also goes on a simple board of each application&rsquo;s stage. Cover Me has no resume builder or LinkedIn profile review, and it doesn&rsquo;t apply for you.
              </p>
            </>
          ),
        },
        {
          title: '2. SkillSyncer: the most free scans',
          body: (
            <p>
              SkillSyncer&rsquo;s free plan gives 2 job match scans a week and 10 AI credits a week, with no card needed. A full AI rewrite costs 5 credits, so the credits cover about two rewrites a week, and you approve each suggestion before it&rsquo;s applied. It&rsquo;s a web app: you upload or build your resume and paste the job description. Paid plans start at $14.95 a month, or $34.86 every 3 months. It has no cover letter tool.
            </p>
          ),
        },
        {
          title: '3. Teal: free job tracking with a keyword check',
          body: (
            <p>
              Teal&rsquo;s free plan has unlimited resumes and job tracking. On the free plan, its Job Matcher shows the top five keywords from a job description, and Teal+ shows the rest. Free AI is a one-time set of credits: 5 for bullets, 2 for summaries and 2 for cover letters. Teal+ is $13 every 7 days, $29 every 30 days or $79 every 90 days. A free Chrome extension saves jobs from job boards to your tracker. The <Link href="/guides/teal-review">Teal review</Link> covers its job board, prices and what users say.
            </p>
          ),
        },
        {
          title: '4. Resume Worded: a relevancy score for one job',
          body: (
            <p>
              Resume Worded&rsquo;s Targeted Resume tool scores your resume against one job description, and the site says a score below 80 means important skills are missing. A free account shows part of the report. The full report and the AI bullet writer are on Pro, at $49 a month, $99 every 3 months or $229 a year. It also reviews LinkedIn profiles.
            </p>
          ),
        },
        {
          title: '5. Enhancv resume checker: a free check with an optional job description',
          body: (
            <p>
              Enhancv&rsquo;s free checker runs 27 checks on a PDF or Word resume up to 2 MB. Paste a job description and it adds which of the job&rsquo;s skills and keywords you have and which you&rsquo;re missing. Without one, it gives a general score. It suggests changes but doesn&rsquo;t rewrite the resume. It also flags things a recruiter might hold against you, such as employment gaps.
            </p>
          ),
        },
        {
          title: '6. Resume.io resume checker: a match score with only an email',
          body: (
            <p>
              Resume.io&rsquo;s free checker runs 16 checks on your resume. Paste a job and it gives two scores, one for how complete your resume is and one for how well it matches the role. You enter an email to see the results, but you don&rsquo;t need an account. Its paid resume builder starts with a 7-day trial.
            </p>
          ),
        },
        {
          title: 'Is Jobscan’s free plan enough?',
          body: (
            <p>
              For a few important applications, it can be. The free plan includes 5 scans a month, and a rescan after you edit your resume counts as a new scan, so fixing one resume for one job can use several. If you apply to more than a handful of jobs a month, or want the rewrite done for you, you&rsquo;ll hit the limit quickly. The <Link href="/guides/jobscan-review">Jobscan review</Link> covers its paid plans and what users say about them.
            </p>
          ),
        },
        {
          title: 'Which one should you use?',
          body: (
            <p>
              If you only want a score and a list of missing keywords to fix by hand, SkillSyncer gives the most free scans, and Enhancv and Resume.io let you paste a job into a free checker. If you&rsquo;re tracking a lot of applications in one place, Teal&rsquo;s free tracker is the strongest. If you want each resume rewritten for the posting and a cover letter written to match, Cover Me does both on its free plan. Whichever you use, change only what&rsquo;s true: the <Link href="/guides/tailor-resume-to-job-description">guide to tailoring your resume</Link> shows how.
            </p>
          ),
        },
      ]}
      faq={faqJsonLd}
      cta={{
        title: 'Tailor your resume on the posting, free',
        body: 'A free account gets 10 generations to start, then 5 a week. No credit card required.',
      }}
    />
  )
}
