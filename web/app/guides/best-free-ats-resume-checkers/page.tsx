import type { Metadata } from 'next'
import Link from 'next/link'
import { GuideArticle, GuideFigure, ext } from '@/components/site/GuideArticle'
import { getGuide } from '@/lib/guides'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'
const guide = getGuide('best-free-ats-resume-checkers')
const CHECKED = 'November 27, 2026'

export const metadata: Metadata = {
  title: { absolute: 'Best Free ATS Resume Checkers Compared (November 2026)' },
  description: 'Eleven free ATS resume checkers compared: free scans per week or month, whether you need an account, whether it reads the job description, and what the result shows.',
  alternates: { canonical: `${BASE}/guides/${guide.slug}` },
  openGraph: {
    title: 'Best free ATS resume checkers, compared | Cover Me',
    description: "Free limits, account rules and results of eleven ATS resume checkers, from each tool's own pages on November 27, 2026.",
    url: `${BASE}/guides/${guide.slug}`,
    siteName: 'Cover Me',
    type: 'article',
    images: [{ url: `${BASE}${guide.image}`, width: 1600, height: 900, alt: 'Free ATS resume checkers compared on free limits and whether they need an account' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Best free ATS resume checkers, compared | Cover Me',
    description: "Free limits, account rules and results of eleven ATS resume checkers, from each tool's own pages on November 27, 2026.",
    images: [`${BASE}${guide.image}`],
  },
}

const SRC = {
  jobscanPlan: 'https://app.jobscan.co/plan',
  jobscanPremium: 'https://www.jobscan.co/video-jobscan-premium',
  skillsyncer: 'https://skillsyncer.com/pricing',
  teal: 'https://www.tealhq.com/pricing',
  resumeWordedUpload: 'https://resumeworded.com/upload-resume',
  resumeWordedPro: 'https://resumeworded.com/get-pro',
  enhancv: 'https://enhancv.com/resources/resume-checker/',
  enhancvPricing: 'https://enhancv.com/pricing/',
  resumeIo: 'https://resume.io/ats-resume-checker',
  rezi: 'https://www.rezi.ai/tools/resume-checker',
  reziPricing: 'https://www.rezi.ai/pricing',
  resyMatch: 'https://cultivatedculture.com/resume-scanner/',
  jobalytics: 'https://www.jobalytics.co/',
  coverMeLimit: 'https://github.com/TheLinc/cover-me/blob/master/backend/supabase/functions/ats-check/index.ts',
  resumeMatcher: 'https://github.com/srbhr/Resume-Matcher',
  kickresume: 'https://www.kickresume.com/en/resume-checker/',
}

type Row = { name: string; limit: string; account: string; posting: string; result: string; sources: { label: string; href: string }[] }

const TOOLS: Row[] = [
  { name: 'Jobscan', limit: '5 resume scans a month', account: 'Yes', posting: 'Yes', result: 'Match rate, searchability tips and a short skills list', sources: [{ label: 'Plans', href: SRC.jobscanPlan }, { label: 'Premium', href: SRC.jobscanPremium }] },
  { name: 'SkillSyncer', limit: '2 job match scans and 10 AI credits a week', account: 'Yes, no card', posting: 'Yes', result: 'Match score, missing keywords and formatting issues', sources: [{ label: 'Pricing', href: SRC.skillsyncer }] },
  { name: 'Teal', limit: 'Top 5 keywords for each job', account: 'Yes', posting: 'Yes', result: 'Basic resume analysis and the top 5 keywords', sources: [{ label: 'Pricing', href: SRC.teal }] },
  { name: 'Resume Worded', limit: 'Your score and top issues; part of the Targeted Resume report', account: 'Yes', posting: 'Yes, in Targeted Resume', result: 'Score, top issues and some missing keywords', sources: [{ label: 'Upload', href: SRC.resumeWordedUpload }, { label: 'Pro', href: SRC.resumeWordedPro }] },
  { name: 'Enhancv', limit: '27 checks, PDF or DOCX up to 2 MB', account: 'Not stated', posting: 'Optional', result: 'Score and task list; with a job, the skills and keywords you have and miss', sources: [{ label: 'Checker', href: SRC.enhancv }] },
  { name: 'Resume.io', limit: '16 checks', account: 'Email only', posting: 'Optional', result: 'Score and fixes; with a job, a separate match score', sources: [{ label: 'Checker', href: SRC.resumeIo }] },
  { name: 'Rezi', limit: 'Up to 23 checks', account: 'Yes', posting: 'Optional', result: 'Score out of 100 and a list of issues', sources: [{ label: 'Checker', href: SRC.rezi }, { label: 'Pricing', href: SRC.reziPricing }] },
  { name: 'ResyMatch', limit: '7 free credits a month', account: 'Yes, verified email', posting: 'Required', result: 'Score for ATS practices, keywords and results shown', sources: [{ label: 'Scanner', href: SRC.resyMatch }] },
  { name: 'Jobalytics', limit: 'Free Chrome extension; limits not stated', account: 'Not stated', posting: 'Yes, on the job board page', result: 'Match rate and keywords to add', sources: [{ label: 'Home', href: SRC.jobalytics }] },
  { name: 'Cover Me', limit: '25 checks a day', account: 'No', posting: 'Required', result: 'Score out of 100, every missing keyword, unmet requirements', sources: [{ label: 'Checker', href: '/ats-checker' }, { label: 'Limit', href: SRC.coverMeLimit }] },
  { name: 'Resume Matcher', limit: 'Free and open source; you run it yourself', account: 'No', posting: 'Yes', result: 'Match score, a tailored rewrite and a cover letter', sources: [{ label: 'GitHub', href: SRC.resumeMatcher }] },
]

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is the best free ATS resume checker?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "It depends on what you need from the free plan. To check a resume against one posting with no account, Cover Me's free checker runs 25 checks a day and lists every missing keyword. With a free account, SkillSyncer gives 2 job match scans a week, ResyMatch 7 credits a month and Jobscan 5 scans a month. For a check without a job description, Enhancv runs 27 checks and Rezi up to 23. Limits are from each tool's own pages on November 27, 2026.",
      },
    },
    {
      '@type': 'Question',
      name: 'Can I check my resume for ATS without signing up?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Yes. Cover Me's free ATS checker at cover-me.dev/ats-checker needs no account or email. Resume.io's checker needs an email address but no account. Jobscan, SkillSyncer, Teal, Resume Worded, Rezi and ResyMatch need a free account. Enhancv's checker page doesn't say whether it asks you to sign up.",
      },
    },
    {
      '@type': 'Question',
      name: 'Which free ATS checkers read a PDF resume?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Most of them. Enhancv, Resume.io and Rezi take PDF or DOCX files up to 2 MB. ResyMatch takes PDF, Word or text files. Cover Me's checker takes a PDF, a Word file or pasted text. A PDF that is a scanned image has no text to read, so any checker will miss what's in it.",
      },
    },
    {
      '@type': 'Question',
      name: 'Is an ATS checker score the same as the employer’s ATS score?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "No. Each checker counts keywords its own way, so the same resume gets a different number in each one, and none of them sees what an employer's applicant tracking system shows a recruiter. The list of missing keywords is more useful than the number.",
      },
    },
  ],
}

const th = 'text-left px-4 py-3 font-bold text-muted-foreground border-b border-border'
const td = 'px-4 py-3 text-muted-foreground border-b border-border'

export default function Page() {
  return (
    <GuideArticle
      guide={guide}
      lede={
        <>
          Most free ATS resume checkers give you a score and a list of missing keywords for a few resumes a week or month. They differ on three things: whether you need an account, whether they read the job description, and how many checks you get before they ask you to pay. Here are eleven of them, with each free limit taken from the tool&rsquo;s own pages on {CHECKED}.
        </>
      }
      tldr={[
        "With a free account, SkillSyncer gives 2 job match scans a week, ResyMatch 7 credits a month and Jobscan 5 scans a month. Teal shows only the top 5 keywords for a job.",
        "Cover Me's free checker needs no account and runs 25 checks a day. Resume.io asks for an email but no account. Enhancv's page doesn't say.",
        "No checker sees the score an employer's ATS gives you. Use the list of missing keywords, not the number.",
      ]}
      intro={
        <p>
          I build Cover Me, one of the tools on this list, so weigh it with that in mind. I read every limit below on the tool&rsquo;s own pricing, help or product page on {CHECKED}, and the Source column links that page. I didn&rsquo;t run a test resume through each one, so this compares what the free plans allow, not how accurate each score is. Free plans change often, so check the linked page before you rely on one.
        </p>
      }
      sections={[
        {
          title: 'Free ATS resume checkers at a glance',
          body: (
            <GuideFigure caption={`What each free plan gives you, from each tool’s own pages on ${CHECKED}.`}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-[13.5px] bg-white border border-border rounded-[8px] overflow-hidden" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr className="bg-elevated">
                      <th className={th}>Tool</th>
                      <th className={th}>Free limit</th>
                      <th className={th}>Account</th>
                      <th className={th}>Reads the job description</th>
                      <th className={th}>Free result</th>
                      <th className={th}>Source, checked Nov 27, 2026</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TOOLS.map((row) => (
                      <tr key={row.name}>
                        <td className={`${td} font-medium ${row.name === 'Cover Me' ? 'text-brand-light' : 'text-foreground'}`}>{row.name}</td>
                        <td className={td}>{row.limit}</td>
                        <td className={td}>{row.account}</td>
                        <td className={td}>{row.posting}</td>
                        <td className={td}>{row.result}</td>
                        <td className={td}>
                          {row.sources.map((s, i) => (
                            <span key={s.href}>
                              {i > 0 && ', '}
                              {s.href.startsWith('/') ? <Link href={s.href}>{s.label}</Link> : <a href={s.href} {...ext}>{s.label}</a>}
                            </span>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GuideFigure>
          ),
        },
        {
          title: '1. Jobscan: 5 free scans a month',
          body: (
            <p>
              Jobscan&rsquo;s <a href={SRC.jobscanPlan} {...ext}>plan page</a> gives a free account 5 resume scans a month. Each scan compares your resume with a job description you paste in. The free result has searchability tips and a short list of skills, and the full skills list and formatting checks are on Premium, according to Jobscan&rsquo;s <a href={SRC.jobscanPremium} {...ext}>Premium page</a>. AI rewriting and the cover letter writer are paid only. Premium is $49.95 a month, or $89.95 every 3 months. A rescan after you edit counts as a new scan, so one job can use several. The <Link href="/guides/jobscan-review">Jobscan review</Link> covers what its match rate measures, and the <Link href="/guides/free-jobscan-alternatives">free Jobscan alternatives</Link> guide compares tools that also rewrite the resume.
            </p>
          ),
        },
        {
          title: '2. SkillSyncer: the most free scans with an account',
          body: (
            <p>
              SkillSyncer&rsquo;s <a href={SRC.skillsyncer} {...ext}>pricing page</a> gives the free plan 2 job match scans a week, 10 AI credits a week and 1 resume, with no card needed. A scan shows a match score, the keywords you&rsquo;re missing and formatting problems that break resume parsers. The AI credits pay for rewrites of your bullets, and you approve each change. Premium is $14.95 a month, or $34.86 every 3 months, with unlimited scans.
            </p>
          ),
        },
        {
          title: '3. Teal: a keyword check inside a free job tracker',
          body: (
            <p>
              Teal&rsquo;s free plan, on its <a href={SRC.teal} {...ext}>pricing page</a>, shows the top 5 keywords from a job description and a basic analysis of your resume. Teal+ shows every keyword. The free plan also has AI credits: 5 for resume bullets, 2 for summaries and 2 for cover letters. Teal+ is $13 every 7 days, $29 every 30 days or $79 every 90 days. The checker is worth it mainly if you already track jobs in Teal. The <Link href="/guides/teal-review">Teal review</Link> covers its job board and what users say.
            </p>
          ),
        },
        {
          title: '4. Resume Worded: a free score, with the details on Pro',
          body: (
            <p>
              Resume Worded&rsquo;s Score My Resume needs a free account and shows your score and top issues for free, according to its <a href={SRC.resumeWordedUpload} {...ext}>upload page</a>. Its Targeted Resume tool scores your resume against one job description. The <a href={SRC.resumeWordedPro} {...ext}>Pro page</a> lists the full Targeted Resume report and the AI bullet writer as Pro features, at $49 a month, $99 every 3 months or $229 a year. It also reviews LinkedIn profiles.
            </p>
          ),
        },
        {
          title: '5. Enhancv: 27 checks, with or without a job',
          body: (
            <p>
              Enhancv&rsquo;s <a href={SRC.enhancv} {...ext}>resume checker</a> runs 27 checks on a PDF or Word resume up to 2 MB and gives a score with a task list. Paste a job description and it adds which of the job&rsquo;s skills and keywords you have and which you&rsquo;re missing. The checker page calls it free and doesn&rsquo;t say whether you need an account. Enhancv&rsquo;s <a href={SRC.enhancvPricing} {...ext}>pricing page</a> lists its free resume builder plan as valid for 7 days. The checker suggests changes but doesn&rsquo;t rewrite the resume.
            </p>
          ),
        },
        {
          title: '6. Resume.io: 16 checks for an email address',
          body: (
            <p>
              Resume.io&rsquo;s <a href={SRC.resumeIo} {...ext}>ATS checker</a> runs 16 checks on how well software can read your resume, how strong the content is and how well it matches a job. You enter an email to see the results, but you don&rsquo;t need an account. Add a job description and it gives a second score for how well you match the role. The page says &ldquo;max 2MB&rdquo; in one place and &ldquo;max 10MB&rdquo; in another, so keep the file under 2 MB.
            </p>
          ),
        },
        {
          title: '7. Rezi: a free score that moves your resume into its template',
          body: (
            <p>
              Rezi&rsquo;s <a href={SRC.rezi} {...ext}>resume checker</a> is free with a Rezi account. It reads a PDF or Word file up to 2 MB, rebuilds it in a one-column template and scores it out of 100 on up to 23 checks, or 27 with Pro. A job description is optional. The free plan on Rezi&rsquo;s <a href={SRC.reziPricing} {...ext}>pricing page</a> allows 1 resume and 3 PDF downloads. Pro is $29 a month, or $149 once for Lifetime. <Link href="/guides/cover-me-vs-rezi">Cover Me vs Rezi</Link> compares the two approaches.
            </p>
          ),
        },
        {
          title: '8. ResyMatch: 7 credits a month, job description required',
          body: (
            <p>
              ResyMatch, from Cultivated Culture, compares your resume with a job description, which it requires. Its <a href={SRC.resyMatch} {...ext}>scanner page</a> asks you to verify your email before you can run free scans, and its credit-limit notice says a free account gets 7 credits a month. You can paste your resume or upload a PDF, Word or text file. The score covers ATS practices, keyword matching and how well your bullets show results. The Unlimited plan is $7 a week.
            </p>
          ),
        },
        {
          title: '9. Jobalytics: a match rate on the job board',
          body: (
            <p>
              Jobalytics is a free Chrome extension. Its <a href={SRC.jobalytics} {...ext}>home page</a> says you upload your resume to the extension, open a posting on LinkedIn, Indeed or another job board, and click Analyze job description to get a match rate and a list of keywords to add. The site doesn&rsquo;t state a limit or a paid plan, and its pricing page returned a 404 on {CHECKED}.
            </p>
          ),
        },
        {
          title: '10. Cover Me: no account, 25 checks a day',
          body: (
            <>
              <p>
                Cover Me&rsquo;s <Link href="/ats-checker">free ATS resume checker</Link> needs no account or email. You paste a job posting, then paste your resume or upload a PDF or Word file. It gives an <Link href="/guides/what-is-an-ats-score">ATS match score</Link> out of 100 and lists every must-have and nice-to-have keyword the posting asks for, with where each one appears in your resume. It also checks hard requirements such as years of experience, whether the job title is on your resume, your contact details and page count, and which bullets have a number. It runs 25 checks a day, a limit set in its <a href={SRC.coverMeLimit} {...ext}>open-source code</a>.
              </p>
              <p>
                The posting and resume go to Anthropic&rsquo;s Claude to read them, and Cover Me doesn&rsquo;t store either. The checker doesn&rsquo;t rewrite anything. The Cover Me Chrome extension does that on the posting you have open: it tailors the resume, writes a cover letter and shows the same score. Its free account gives 10 generations to start, then 5 a week.
              </p>
            </>
          ),
        },
        {
          title: '11. Resume Matcher: open source, on your own computer',
          body: (
            <p>
              <a href={SRC.resumeMatcher} {...ext}>Resume Matcher</a> is open source under the Apache 2.0 license and free, with no account. You install it on your own computer and connect an AI model, either one you run locally or an API key you pay for. It scores your resume against a job description and can write a tailored version and a cover letter. It suits people who are comfortable installing developer tools.
            </p>
          ),
        },
        {
          title: 'Left out, and why',
          body: (
            <p>
              Kickresume&rsquo;s <a href={SRC.kickresume} {...ext}>ATS checker</a> is free only for verified students and teachers. Paid-only tools with no free check are out, and so are resume builders whose check works only on a resume you build in them.
            </p>
          ),
        },
        {
          title: 'Which one should you use?',
          body: (
            <p>
              For a quick check against one posting with no sign-up, use Cover Me&rsquo;s checker, or Resume.io&rsquo;s if you don&rsquo;t mind giving an email. If you apply to a few jobs a week and want scans saved in an account, SkillSyncer&rsquo;s 2 a week go furthest, and its AI credits also rewrite bullets. Jobscan&rsquo;s 5 a month suit a handful of important applications. If you&rsquo;d rather check the resume&rsquo;s format with no job in mind, Enhancv and Rezi both do that. Whichever you use, add only keywords that are true of you: the <Link href="/guides/tailor-resume-to-job-description">guide to tailoring your resume</Link> shows how, and the <Link href="/guides/ats-friendly-resume-format">ATS format test</Link> shows which layouts real ATSs misread.
            </p>
          ),
        },
      ]}
      faq={faqJsonLd}
      cta={{
        title: 'Fix the missing keywords on the posting',
        body: 'Cover Me tailors your resume and writes a cover letter for the job you have open. A free account gets 10 generations to start, then 5 a week.',
      }}
    />
  )
}
