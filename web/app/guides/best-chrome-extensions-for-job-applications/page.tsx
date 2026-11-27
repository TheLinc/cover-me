import type { Metadata } from 'next'
import Link from 'next/link'
import { GuideArticle, GuideFigure, ext } from '@/components/site/GuideArticle'
import { getGuide } from '@/lib/guides'
import { CHROME_STORE_URL } from '@/lib/utils'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'
const guide = getGuide('best-chrome-extensions-for-job-applications')


export const metadata: Metadata = {
  title: { absolute: 'Best Chrome Extensions for Job Applications (2026), Compared' },
  description: guide.description,
  alternates: { canonical: `${BASE}/guides/${guide.slug}` },
  openGraph: {
    title: 'Best Chrome extensions for job applications (2026) | Cover Me',
    description: guide.description,
    url: `${BASE}/guides/${guide.slug}`,
    siteName: 'Cover Me',
    type: 'article',
    images: [{ url: `${BASE}${guide.image}`, width: 1600, height: 900, alt: 'Chrome extensions for job applications sorted by job, with free limits' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Best Chrome extensions for job applications (2026) | Cover Me',
    description: guide.description,
    images: [`${BASE}${guide.image}`],
  },
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is the best Chrome extension for job applications?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'It depends on the job you want done. To fill in application forms, Simplify Copilot autofills with no limit on its free plan. To track applications, Huntr and Teal both save jobs from LinkedIn and Indeed for free. To rewrite your resume for the posting and write the cover letter, Cover Me does both on its free plan: 10 generations to start, then 5 a week. For a free keyword check, Jobalytics shows a match score and the keywords your resume is missing.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is there a free Chrome extension that autofills job applications?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Yes. Simplify Copilot and Huntr both say autofill is unlimited on their free plans. JobWizard's free plan autofills 30 jobs a week. Each one fills the form and leaves the submit button to you.",
      },
    },
    {
      '@type': 'Question',
      name: 'Which Chrome extension writes cover letters for free?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Cover Me writes a cover letter for the posting you have open within its free generations, 10 to start and then 5 a week. JobWizard's free plan lists 30 cover letters a week, and Teal's free plan has 2 cover letter credits. Simplify, Careerflow and Jobscan keep AI cover letters on paid plans.",
      },
    },
    {
      '@type': 'Question',
      name: 'Which Chrome extension shows the keywords missing from my resume?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Jobalytics is free and shows a 0 to 100 match score with the missing keywords. Cover Me shows an ATS score out of 100 and every missing keyword after it tailors your resume. JobWizard's match score is always free, Teal's free plan shows the top 5 keywords, and Simplify's extension has a keyword panel.",
      },
    },
    {
      '@type': 'Question',
      name: 'Do these extensions submit applications for me?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "None of the nine submits an application on its free plan. The autofill tools fill the form and you press submit, and Cover Me never fills or submits forms. Simplify's paid Autopilot is the exception: it fills and submits without a review step.",
      },
    },
  ],
}

const CHECKED = 'November 27, 2026'

type Tool = { name: string; store: string; job: string; free: string; paid: string; sites: string; users: string; source: string; sourceLabel: string }

const TOOLS: Tool[] = [
  {
    name: 'Simplify Copilot',
    store: 'https://chromewebstore.google.com/detail/simplify-copilot-autofill/pbanhockgagggenencehbnadejlgchfc',
    job: 'Autofill',
    free: 'Autofill with no limit, job tracker, resume keyword panel',
    paid: 'Simplify+ $19.99 a week or $39.99 a month',
    sites: 'Workday, Greenhouse, Lever, iCIMS, Taleo, SmartRecruiters; LinkedIn and Indeed for keywords',
    users: '500,000 users, 4.8 from 3.9K ratings',
    source: 'https://help.simplify.jobs/articles/5623502-whats-included-in-simplify-features-and-pricing',
    sourceLabel: 'Help center',
  },
  {
    name: 'JobWizard',
    store: 'https://chromewebstore.google.com/detail/jobwizard-ai-job-applicat/kbhgdbfkbgkokgkkdhnnlmkhnokjmfib',
    job: 'Autofill',
    free: '30 autofills, 30 cover letters and 30 resume retouches a week; match score and tracker',
    paid: '$6.99 for 7 days, or $17.99 a month',
    sites: 'Workday, Greenhouse, Lever, Ashby, iCIMS, SmartRecruiters, Taleo, LinkedIn Easy Apply',
    users: '10,000 users, 4.4 from 138 ratings',
    source: 'https://jobwizard.ai/pricing',
    sourceLabel: 'Pricing',
  },
  {
    name: 'Jobright Autofill',
    store: 'https://chromewebstore.google.com/detail/jobright-autofill-%E2%80%93-insta/odcnpipkhjegpefkfplmedhmkmmhmoko',
    job: 'Autofill',
    free: '4 autofills, 2 AI resumes and 2 cover letters a day',
    paid: 'Turbo $17.99 a week, or $29.99 a month on a timed offer',
    sites: 'Workday, Greenhouse, Lever, iCIMS, Ashby, Workable',
    users: '200,000 users, 4.9 from 438 ratings',
    source: '/guides/jobright-review',
    sourceLabel: 'upgrade page after sign-in, November 21',
  },
  {
    name: 'Huntr',
    store: 'https://chromewebstore.google.com/detail/huntr-job-search-tracker/mihdfbecejheednfigjpdacgeilhlmnf',
    job: 'Job tracking',
    free: 'Track 100 jobs, autofill with no limit, 2 tailored resumes',
    paid: 'Pro $40 a month or $90 every 3 months',
    sites: 'Saves from LinkedIn, Indeed, Dice, Greenhouse, Lever and other sites',
    users: '90,000 users, 4.6 from 1.3K ratings',
    source: 'https://huntr.co/pricing',
    sourceLabel: 'Pricing',
  },
  {
    name: 'Teal',
    store: 'https://chromewebstore.google.com/detail/teal-job-search-companion/opafjjlpbiaicbbgifbejoochmmeikep',
    job: 'Job tracking',
    free: 'Unlimited job tracking, top 5 keywords, 2 cover letter credits',
    paid: 'Teal+ $13 every 7 days or $29 every 30 days',
    sites: '40+ job boards including LinkedIn, Indeed and Glassdoor, and a bookmark on any site',
    users: '200,000 users, 4.7 from 3.2K ratings',
    source: 'https://www.tealhq.com/pricing',
    sourceLabel: 'Pricing',
  },
  {
    name: 'Careerflow',
    store: 'https://chromewebstore.google.com/detail/careerflow-ai-job-applica/iadokddofjgcgjpjlfhngclhpmaelnli',
    job: 'Job tracking',
    free: 'Tracker and autofill, marked “will be limited soon”; no AI cover letters',
    paid: 'Premium $8.99 a week or $23.99 a month',
    sites: 'Saves from 45+ job sites including LinkedIn and Indeed; autofills Greenhouse, Lever and Workable',
    users: '200,000 users, 4.3 from 288 ratings',
    source: 'https://www.careerflow.ai/premium',
    sourceLabel: 'Pricing',
  },
  {
    name: 'Jobscan',
    store: 'https://chromewebstore.google.com/detail/jobscan-job-search-tracke/apppjobnbahbomhgmcgolplkpigjlofl',
    job: 'Job tracking',
    free: '5 resume scans a month and the job tracker',
    paid: '$49.95 a month, or $89.95 every 3 months',
    sites: 'Saves from Indeed, LinkedIn and Glassdoor',
    users: '10,000 users, 4.3 from 45 ratings',
    source: 'https://app.jobscan.co/plan',
    sourceLabel: 'Plans',
  },
  {
    name: 'Cover Me',
    store: CHROME_STORE_URL,
    job: 'Tailoring and cover letters',
    free: '10 tailored resumes or cover letters to start, then 5 a week; ATS score',
    paid: 'Pro $15 a month or $35 every 3 months',
    sites: 'LinkedIn, Indeed, Greenhouse, Lever, Workday, Ashby, BambooHR, Workable; paste from any site',
    users: '354 users, 5.0 from 5 ratings',
    source: '/#pricing',
    sourceLabel: 'Pricing',
  },
  {
    name: 'Jobalytics',
    store: 'https://chromewebstore.google.com/detail/jobalytics-resume-keyword/fkiljfkkceaopbpfgfmjdnkiejaifkgd',
    job: 'ATS keyword check',
    free: 'Free: 0 to 100 match score and missing keywords',
    paid: 'No paid plan',
    sites: 'LinkedIn, Indeed and, it says, any job listing',
    users: '200,000 users, 4.3 from 228 ratings',
    source: 'https://www.jobalytics.co/',
    sourceLabel: 'Website',
  },
]

const th = 'text-left px-4 py-3 font-bold text-muted-foreground border-b border-border'
const td = 'px-4 py-3 text-muted-foreground border-b border-border align-top'

export default function Page() {
  return (
    <GuideArticle
      guide={guide}
      lede={
        <>
          The best Chrome extension for job applications depends on the part of applying you want help with. Simplify Copilot is the most used autofill tool, and its free plan fills forms with no limit. Huntr and Teal save jobs from LinkedIn and Indeed to a free tracker. Cover Me (cover-me.dev) rewrites your resume for the posting you have open and writes the cover letter, on its free plan. Jobalytics is a free keyword check.
        </>
      }
      tldr={[
        'Autofill: Simplify Copilot autofills with no limit for free. JobWizard gives 30 autofills a week free. Both leave the submit button to you.',
        'Job tracking: Huntr tracks 100 jobs free, Teal tracks unlimited jobs free, and both have a Chrome clipper for LinkedIn and Indeed.',
        'Tailoring and cover letters: Cover Me rewrites your resume and writes the letter for the posting you have open, 10 to start and then 5 a week free. Simplify and Careerflow keep AI cover letters on paid plans.',
        'Keyword checks: Jobalytics is free with no paid plan. JobWizard, Teal and Cover Me also show a match score.',
      ]}
      intro={
        <p>
          I build Cover Me, so weigh its place in this list with that in mind. Every other fact comes from each extension&rsquo;s Chrome Web Store listing and its maker&rsquo;s pricing and help pages, read on {CHECKED}. I didn&rsquo;t sign up for the other tools, so the job sites listed are the ones each maker names, and where a maker&rsquo;s own pages disagree, this page says so. Free plans and store numbers change often, so check one before you rely on it.
        </p>
      }
      sections={[
        {
          title: 'Chrome extensions for job applications at a glance',
          body: (
            <GuideFigure caption={`Each extension sorted by its main job. Limits and prices from each maker’s site, users and ratings from the Chrome Web Store, all checked ${CHECKED}.`}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-[13.5px] bg-white border border-border rounded-[8px] overflow-hidden" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr className="bg-elevated">
                      <th className={th}>Extension</th>
                      <th className={th}>Main job</th>
                      <th className={th}>Free plan</th>
                      <th className={th}>Paid from</th>
                      <th className={th}>Job sites it names</th>
                      <th className={th}>Chrome Web Store</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TOOLS.map((t) => (
                      <tr key={t.name}>
                        <td className={`${td} font-medium ${t.name === 'Cover Me' ? 'text-brand-light' : 'text-foreground'}`}>
                          <a href={t.store} {...ext}>{t.name}</a>
                        </td>
                        <td className={td}>{t.job}</td>
                        <td className={td}>
                          {t.free} ({t.source.startsWith('http') ? <a href={t.source} {...ext}>{t.sourceLabel}</a> : <Link href={t.source}>{t.sourceLabel}</Link>})
                        </td>
                        <td className={td}>{t.paid}</td>
                        <td className={td}>{t.sites}</td>
                        <td className={td}>{t.users}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GuideFigure>
          ),
        },
        {
          title: 'Autofill: Simplify Copilot, JobWizard and Jobright',
          body: (
            <>
              <p>
                Autofill extensions copy your profile into application forms on employer sites, so you don&rsquo;t type your work history into Workday again. They save the most time when you apply on company career pages. None of the three submits the form on its free plan.
              </p>
              <p>
                <strong>Simplify Copilot</strong> is the most used extension here, with 500,000 users. Simplify says its free autofill has &ldquo;no limit on how many applications you can submit&rdquo; and works on &ldquo;over 100 job boards and application portals including Workday, Greenhouse, iCIMS, Taleo, Avature, Lever, and SmartRecruiters&rdquo; (<a href="https://simplify.jobs/copilot" {...ext}>Copilot page</a>). On LinkedIn and Indeed it reads the posting to show keywords missing from your resume rather than filling a form. Its store listing advertises AI tailored resumes and cover letters, but the <a href="https://help.simplify.jobs/articles/5623502-whats-included-in-simplify-features-and-pricing" {...ext}>help center</a> puts both behind Simplify+, at $19.99 a week, $39.99 a month or $89.99 for 3 months. Simplify+ also includes Autopilot, which fills and submits &ldquo;without a review step&rdquo;. The listing says &ldquo;thousands of job boards&rdquo;, so the two pages disagree on coverage.
              </p>
              <p>
                <strong>JobWizard</strong> has the most generous free AI quota of the autofill tools. Its <a href="https://jobwizard.ai/pricing" {...ext}>pricing page</a> lists 30 job autofills, 30 cover letters, 30 resume retouches and 30 keyword suggestions a week, with the match score and application tracker &ldquo;always free&rdquo;. Its <a href="https://jobwizard.ai/features/smart-autofill" {...ext}>autofill page</a> names Workday, Greenhouse, Lever, Ashby, iCIMS, SmartRecruiters, Oracle Taleo and LinkedIn Easy Apply. Paid plans start at $6.99 for 7 days with no auto-renew, behind a toggle on the pricing page, or $17.99 a month. The store listing says JobWizard &ldquo;never submits an application for you&rdquo;. It&rsquo;s small, with 10,000 users, and its own site claims 30K+.
              </p>
              <p>
                <strong>Jobright Autofill</strong> says it supports &ldquo;MyWorkdayJobs, Greenhouse, Lever, iCIMS, Ashby, Workable and more&rdquo;, and that you &ldquo;review, edit, and submit&rdquo; each form yourself (<a href="https://jobright.ai/job-autofill" {...ext}>autofill page</a>). Jobright doesn&rsquo;t publish its free limits or prices before you sign in. Its upgrade page, checked for the <Link href="/guides/jobright-review">Jobright review</Link> on November 21, 2026, gave a free account 4 autofills, 2 AI resumes and 2 cover letters a day, and Turbo at $17.99 a week, or $29.99 a month on a timed offer. That review also compares it with Simplify.
              </p>
            </>
          ),
        },
        {
          title: 'Job tracking: Huntr, Teal, Careerflow and Jobscan',
          body: (
            <>
              <p>
                Trackers add a save button to job postings. One click copies the title, company and description onto a board where you move each application from saved to applied to interview.
              </p>
              <p>
                <strong>Huntr</strong>&rsquo;s free plan tracks up to 100 jobs and includes &ldquo;Unlimited Application Autofills&rdquo;, 2 job-tailored resumes and basic resume matching (<a href="https://huntr.co/pricing" {...ext}>pricing</a>). Its listing says it saves jobs from &ldquo;Indeed and LinkedIn, boards like Dice and Dribbble, and ATS systems like Greenhouse and Lever&rdquo;. Neither page names Workday. Pro is $40 a month, or $90 every 3 months, and adds AI cover letters and the full keyword list.
              </p>
              <p>
                <strong>Teal</strong>&rsquo;s free plan has unlimited job tracking, keyword matching for the top 5 keywords of a posting, and AI credits for 5 resume bullets, 2 summaries and 2 cover letters (<a href="https://www.tealhq.com/pricing" {...ext}>pricing</a>). The extension &ldquo;supports 40+ job boards, including LinkedIn, Indeed, Glassdoor&rdquo; (<a href="https://www.tealhq.com/tool/job-search-chrome-extension" {...ext}>extension page</a>), and since May 2025 it can bookmark a job on any site. It doesn&rsquo;t autofill forms, and its store listing was last updated June 26, 2025, the oldest here. Teal+ is $13 every 7 days, $29 every 30 days or $79 every 90 days. The <Link href="/guides/teal-review">Teal review</Link> has more.
              </p>
              <p>
                <strong>Careerflow</strong> saves jobs from &ldquo;45+ job platforms including LinkedIn, Indeed, Monster, USAJobs&rdquo;, according to its store listing. Its <a href="https://www.careerflow.ai/premium" {...ext}>pricing page</a> marks the free tracker and autofill &ldquo;Included (Will be limited soon)&rdquo; without a number, and keeps AI cover letters and the ATS keyword analyzer on Premium, from $8.99 a week or $23.99 a month. A Black Friday sale was running when this was checked. Its <a href="https://www.careerflow.ai/autofill" {...ext}>autofill page</a> names Greenhouse, Workday and Lever, but its <a href="https://help.careerflow.ai/en/articles/9023726-an-always-up-to-date-list-of-the-job-boards-careerflow-ai-supports" {...ext}>help center&rsquo;s list</a> of autofill sites leaves out Workday. The <Link href="/guides/careerflow-review">Careerflow review</Link> covers its refund terms and what users report.
              </p>
              <p>
                <strong>Jobscan</strong>&rsquo;s extension saves jobs to its tracker from Indeed, LinkedIn and Glassdoor (<a href="https://www.jobscan.co/job-tracker" {...ext}>job tracker page</a>). To see how well you match a saved job, you run a resume scan, and the free plan includes 5 a month (<a href="https://app.jobscan.co/plan" {...ext}>plans</a>). AI rewriting and cover letters are on paid plans, at $49.95 a month or $89.95 every 3 months. The <Link href="/guides/jobscan-review">Jobscan review</Link> covers what its match rate measures.
              </p>
            </>
          ),
        },
        {
          title: 'Resume tailoring and cover letters: Cover Me',
          body: (
            <>
              <p>
                <strong>Cover Me</strong> works on the job posting you have open. Click Tailor and it rewrites your resume&rsquo;s bullets, summary and skills in the posting&rsquo;s words, then shows an <Link href="/guides/what-is-an-ats-score">ATS score</Link> out of 100 with every keyword you&rsquo;re still missing. Click Generate and it writes a cover letter for that job. A check removes any skill your original resume doesn&rsquo;t support, and job titles, employers and dates never change. For a written question on the application, right-click its box and Cover Me types an answer from your resume and the posting, for you to edit.
              </p>
              <p>
                It reads postings on <Link href="/for/linkedin">LinkedIn</Link>, <Link href="/for/indeed">Indeed</Link>, <Link href="/for/greenhouse">Greenhouse</Link>, <Link href="/for/lever">Lever</Link>, <Link href="/for/workday">Workday</Link> and <Link href="/for/ashby">Ashby</Link>, plus BambooHR and Workable, and you can paste a posting from any other site. Its readers are tested against live LinkedIn postings every week.
              </p>
              <p>
                The free account gives 10 tailored resumes or cover letters to start, then 5 a week, plus 5 answers to application questions to start, then 5 a week, with no credit card. Pro is $15 a month or $35 every 3 months, for up to 25 a day. With your own OpenAI or Claude API key it&rsquo;s unlimited and needs no account. It&rsquo;s the smallest extension here, with 354 users and a 5.0 rating from 5 ratings on its <a href={CHROME_STORE_URL} {...ext}>Chrome Web Store listing</a>. Cover Me doesn&rsquo;t fill in or submit application forms, so pair it with an autofill tool if you want both.
              </p>
            </>
          ),
        },
        {
          title: 'ATS keyword checks: Jobalytics',
          body: (
            <>
              <p>
                <strong>Jobalytics</strong> does one thing. On a posting, click Analyze and it gives &ldquo;an instant match score from 0-100&rdquo; and lists the keywords missing from your resume. Its listing says it&rsquo;s &ldquo;100% free and works on every job board and any job listing online&rdquo;, and its <a href="https://www.jobalytics.co/" {...ext}>site</a> names LinkedIn and Indeed. It has 200,000 users and no paid plan. It doesn&rsquo;t save jobs, fill forms or rewrite anything, and its website footer still reads &ldquo;© 2019-2021&rdquo;, though the extension was updated on November 16, 2026.
              </p>
              <p>
                Several tools above also check keywords: JobWizard&rsquo;s match score is always free, Teal shows the top 5 keywords free, Simplify has a keyword panel, and Cover Me scores the tailored resume. Each counts keywords its own way, so the same resume gets a different number in each, and none is the score an employer&rsquo;s system shows a recruiter. For a check without installing anything, the <Link href="/ats-checker">free ATS resume checker</Link> takes a pasted posting and resume.
              </p>
            </>
          ),
        },
        {
          title: 'What about auto-apply extensions?',
          body: (
            <p>
              Auto-apply bots such as LazyApply and LoopCV send applications for you without a review, and they aren&rsquo;t ranked here.
            </p>
          ),
        },
        {
          title: 'Which one should you use?',
          body: (
            <p>
              Most people end up with two: one that fills forms or tracks jobs, and one that writes. If you apply on Workday and other company sites, Simplify Copilot&rsquo;s free autofill saves the most typing. If you want every application on one board, Huntr or Teal. If you want your resume rewritten for each posting and a cover letter written to match, Cover Me does both on its free plan, and the <Link href="/guides/tailor-resume-to-job-description">guide to tailoring your resume</Link> shows what good tailoring changes. If you only want to see missing keywords, Jobalytics is free. For more resume checkers that run on a website rather than in Chrome, see <Link href="/guides/free-jobscan-alternatives">free Jobscan alternatives</Link>.
            </p>
          ),
        },
        {
          title: 'How these were checked',
          body: (
            <p>
              On {CHECKED}, I read each extension&rsquo;s Chrome Web Store listing for its users, rating, update date and what it says it does, then its maker&rsquo;s pricing page and help articles for free limits, prices and supported job sites. Pages that load their prices with JavaScript were opened in a browser. I didn&rsquo;t create accounts or install the other extensions, so the job sites are the ones each maker names. The extensions are the ones that pages AI tools cite for this question name most often, plus Jobright, JobWizard, Careerflow and Jobalytics. Grammar checkers and general AI sidebars are left out.
            </p>
          ),
        },
      ]}
      faq={faqJsonLd}
      cta={{
        title: 'Tailor your resume on the posting, free',
        body: 'A free account gets 10 tailored resumes or cover letters to start, then 5 a week. No credit card required.',
      }}
    />
  )
}
