import type { Metadata } from 'next'
import Link from 'next/link'
import { GuideArticle, GuideFigure, ext } from '@/components/site/GuideArticle'
import { getGuide } from '@/lib/guides'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'
const guide = getGuide('best-free-ats-resume-checkers')
const CHECKED = 'November 27, 2026'

export const metadata: Metadata = {
  title: { absolute: 'Best Free ATS Resume Checkers, Tested (November 2026)' },
  description: 'Eight free ATS resume checkers run on the same made-up resume and posting, with 4 keywords missing on purpose. Which ones found them, what each free plan hid, and the free limits of eleven.',
  alternates: { canonical: `${BASE}/guides/${guide.slug}` },
  openGraph: {
    title: 'Best free ATS resume checkers, compared | Cover Me',
    description: 'Eight free ATS checkers tested on one resume with 4 missing keywords, and the free limits of eleven, checked November 27, 2026.',
    url: `${BASE}/guides/${guide.slug}`,
    siteName: 'Cover Me',
    type: 'article',
    images: [{ url: `${BASE}${guide.image}`, width: 1600, height: 900, alt: 'How many of the 4 missing keywords each free ATS resume checker found on the same test resume' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Best free ATS resume checkers, compared | Cover Me',
    description: 'Eight free ATS checkers tested on one resume with 4 missing keywords, and the free limits of eleven, checked November 27, 2026.',
    images: [`${BASE}${guide.image}`],
  },
}

const SRC = {
  jobscanPlan: 'https://app.jobscan.co/plan',
  jobscanPremium: 'https://www.jobscan.co/video-jobscan-premium',
  jobscanRescan: 'https://jobscansupport.frontkb.com/en/articles/11538561',
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

const TEST_FILES = {
  resumePdf: '/guides/best-free-ats-resume-checkers/test-resume.pdf',
  resumeTxt: '/guides/best-free-ats-resume-checkers/test-resume.txt',
  posting: '/guides/best-free-ats-resume-checkers/test-posting.txt',
}

const RESULTS = [
  { name: 'Resume Worded', score: '81 relevancy', found: '4', mistakes: '"Analytics", taken from the company\'s name', hidden: 'Editing and rescoring on the page (Pro)' },
  { name: 'Rezi', score: '64 Rezi Score, for resume quality', found: '4', mistakes: 'None in the free view, but its import dropped both start dates', hidden: '10 more keywords (Pro)' },
  { name: 'Cover Me', score: '63 out of 100', found: '4', mistakes: 'None', hidden: 'Nothing' },
  { name: 'Jobscan', score: '79% match', found: '3, missed Gainsight', mistakes: 'Said the posting asks for no years of experience; it asks for 4+', hidden: 'Not checked: the test account once had a Premium trial' },
  { name: 'SkillSyncer', score: '70% match', found: '3, missed Gainsight', mistakes: '"Analytics" and "Test", taken from the company\'s name and the posting\'s last line', hidden: 'Nothing; 1 of 2 weekly scans left' },
  { name: 'ResyMatch', score: '41% match', found: '3, missed Gainsight', mistakes: 'QBRs and account management marked missing, though both are on the resume; "Analytics"', hidden: 'All but 5 skills until you make a free account' },
  { name: 'Enhancv', score: '64 out of 100', found: '2 shown free', mistakes: 'Listed Zendesk as missing; it\'s on the resume', hidden: 'The rest of the skill list (Pro)' },
  { name: 'Teal', score: '60% match', found: '0 shown free', mistakes: 'Showed "Accounting" as found; the posting doesn\'t ask for it', hidden: '15 of 20 keywords, including all 4 gaps (Teal+)' },
]

const TOOLS = [
  { name: 'Jobscan', limit: '5 resume scans a month', account: 'Yes', posting: 'Yes', result: 'Match rate, searchability tips and a short skills list', sources: [{ label: 'Plans', href: SRC.jobscanPlan }, { label: 'Premium', href: SRC.jobscanPremium }] },
  { name: 'SkillSyncer', limit: '2 job match scans and 10 AI credits a week', account: 'Yes, no card', posting: 'Yes', result: 'Match score, missing keywords, job title and degree match', sources: [{ label: 'Pricing', href: SRC.skillsyncer }] },
  { name: 'Teal', limit: 'Top 5 keywords for each job', account: 'Yes', posting: 'Yes', result: 'Match score and 5 keywords; the rest need Teal+', sources: [{ label: 'Pricing', href: SRC.teal }] },
  { name: 'Resume Worded', limit: 'Not stated; the full Targeted Resume report is on Pro', account: 'Yes', posting: 'Yes, in Targeted Resume', result: 'Relevancy score and missing keywords', sources: [{ label: 'Upload', href: SRC.resumeWordedUpload }, { label: 'Pro', href: SRC.resumeWordedPro }] },
  { name: 'Enhancv', limit: 'Not stated', account: 'No', posting: 'Optional', result: 'Score from 27 checks and a task list; with a job, the skills and keywords you have and miss', sources: [{ label: 'Checker', href: SRC.enhancv }] },
  { name: 'Resume.io', limit: 'Not stated', account: 'Email, which signs you up', posting: 'Optional', result: 'Score from 16 checks and fixes; with a job, a separate match score', sources: [{ label: 'Checker', href: SRC.resumeIo }] },
  { name: 'Rezi', limit: '1 resume', account: 'Yes', posting: 'Optional', result: 'Score out of 100 and some missing keywords; the rest need Pro', sources: [{ label: 'Checker', href: SRC.rezi }, { label: 'Pricing', href: SRC.reziPricing }] },
  { name: 'ResyMatch', limit: '7 free credits a month', account: 'Not for a first scan; yes for the full list', posting: 'Required', result: 'Score for ATS practices, keywords and results shown', sources: [{ label: 'Scanner', href: SRC.resyMatch }] },
  { name: 'Jobalytics', limit: 'Free Chrome extension; limits not stated', account: 'Not stated', posting: 'Yes, on the job board page', result: 'Match rate and keywords to add', sources: [{ label: 'Home', href: SRC.jobalytics }] },
  { name: 'Cover Me', limit: '25 scans a day', account: 'No', posting: 'Required', result: 'Score out of 100, missing keywords, unmet requirements', sources: [{ label: 'Checker', href: '/ats-checker' }, { label: 'Limit', href: SRC.coverMeLimit }] },
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
        text: "In a test on November 27, 2026, eight free checkers read the same made-up resume, which lacked 4 of the posting's keywords: Salesforce, Gainsight, SQL and Tableau. Resume Worded, Rezi and Cover Me's free checker found all 4 on their free plans. Jobscan, SkillSyncer and ResyMatch found 3 and missed Gainsight. Enhancv showed 2 before asking for Pro, and Teal's free view showed none of them. Cover Me's checker needs no account and allows 25 scans a day; SkillSyncer gives 2 scans a week and Jobscan 5 a month with a free account.",
      },
    },
    {
      '@type': 'Question',
      name: 'Can I check my resume for ATS without signing up?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Yes. In a test on November 27, 2026, Cover Me's free ATS checker and Enhancv's checker both scored a resume with no account or email. ResyMatch ran a first scan without an account but asked for one to show the full skill list. Resume.io asks for your email to show results and uses it to sign you up. Jobscan, SkillSyncer, Teal, Resume Worded and Rezi need a free account.",
      },
    },
    {
      '@type': 'Question',
      name: 'Which free ATS checkers read a PDF resume?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Most of them. Enhancv and Rezi take PDF or DOCX files up to 2 MB, and Resume.io takes PDF or DOCX. ResyMatch takes PDF, Word or text files, but in a test it ran the PDF's lines together, so words like \"renewingand\" appeared and it missed a skill that was on the resume. Rezi's import dropped the start dates from the same PDF. Cover Me's checker takes a PDF, a Word file or pasted text. A PDF that is a scanned image has no text to read, so any checker will miss what's in it.",
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
const link = 'text-brand-strong underline underline-offset-2'

export default function Page() {
  return (
    <GuideArticle
      guide={guide}
      lede={
        <>
          I ran the same made-up resume and job posting through eight free ATS resume checkers. The resume lacked 4 of the posting&rsquo;s keywords on purpose. Three checkers found all 4 on their free plans and three found 3. Enhancv showed 2 and Teal showed none without paying. Below are the results, plus the free limits of eleven checkers, from each tool&rsquo;s own pages on {CHECKED}.
        </>
      }
      tldr={[
        'Resume Worded, Rezi and Cover Me found all 4 missing keywords on their free plans. Jobscan, SkillSyncer and ResyMatch found 3 and missed Gainsight.',
        "Teal's free view showed none of the 4, and Enhancv showed 2 before asking for Pro. Four tools also flagged words that weren't real gaps, such as the company's name.",
        'The same resume scored between 41 and 81. The scores measure different things, so use the list of missing keywords, not the number.',
      ]}
      intro={
        <p>
          I build Cover Me, one of the tools on this list, and I wrote the test, so weigh both with that in mind. You can rerun it: the resume and posting are linked below. I ran every tool on its free plan on {CHECKED}, and read each free limit on the tool&rsquo;s own pricing, help or product page the same day. The link under each tool&rsquo;s name in the second table goes to that page. Free plans change often, so check the linked page before you rely on one.
        </p>
      }
      sections={[
        {
          title: 'The test: one resume, one posting, 4 missing keywords',
          body: (
            <>
              <p>
                The posting is for a customer success manager at Tailspin Analytics, a made-up company. It asks for Salesforce, Gainsight, customer onboarding, churn reduction, renewals and running QBRs, with SQL, Zendesk, Tableau and NPS programs as nice-to-haves. The resume belongs to Jordan Ellis, a made-up customer success manager with six years at two made-up software companies. It&rsquo;s a one-column PDF with real text.
              </p>
              <p>
                The resume leaves out 4 of the posting&rsquo;s keywords: Salesforce, Gainsight, SQL and Tableau. A good checker should flag those 4. Two keywords are there in other words: &ldquo;quarterly business reviews&rdquo; for QBRs, and &ldquo;cut gross churn&rdquo; for churn reduction. The resume also lists HubSpot and Looker, which are not the same as Salesforce and Tableau. Download the <a href={TEST_FILES.resumePdf}>test resume (PDF)</a>, the <a href={TEST_FILES.resumeTxt}>same resume as text</a> or the <a href={TEST_FILES.posting}>test posting</a> to try a checker yourself.
              </p>
            </>
          ),
        },
        {
          title: 'Which checkers found the missing keywords',
          body: (
            <>
              <GuideFigure caption={`Eight free checkers on the same resume and posting, run on ${CHECKED}. Scores measure different things in each tool, so compare the gaps found, not the numbers.`}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] text-[13.5px] bg-white border border-border rounded-[8px] overflow-hidden" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr className="bg-elevated">
                        <th className={th}>Tool</th>
                        <th className={th}>Score</th>
                        <th className={th}>Real gaps found, of 4</th>
                        <th className={th}>Clear mistakes</th>
                        <th className={th}>Hidden on the free plan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {RESULTS.map((row) => (
                        <tr key={row.name}>
                          <td className={`${td} font-medium ${row.name === 'Cover Me' ? 'text-brand-light' : 'text-foreground'}`}>{row.name}</td>
                          <td className={td}>{row.score}</td>
                          <td className={td}>{row.found}</td>
                          <td className={td}>{row.mistakes}</td>
                          <td className={td}>{row.hidden}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GuideFigure>
              <p>
                Gainsight was the keyword most tools missed. The most common mistake was taking &ldquo;Analytics&rdquo; from the company&rsquo;s name as a skill to add, which Resume Worded, SkillSyncer and ResyMatch all did.
              </p>
              <p>
                Three tools weren&rsquo;t tested. Resume.io&rsquo;s upload didn&rsquo;t respond in the test browser, Jobalytics works only inside a posting on a job board, and Resume Matcher has to be installed with an AI key. Jobscan, Teal and Rezi ran on free accounts that already existed in the test browser. The others got new free accounts, or none.
              </p>
            </>
          ),
        },
        {
          title: 'Free ATS resume checkers at a glance',
          body: (
            <GuideFigure caption={`What each free plan gives you, from the source page linked under each tool’s name, checked ${CHECKED}.`}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-[13.5px] bg-white border border-border rounded-[8px] overflow-hidden" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr className="bg-elevated">
                      <th className={th}>Tool and source</th>
                      <th className={th}>Free limit</th>
                      <th className={th}>Account</th>
                      <th className={th}>Reads the job description</th>
                      <th className={th}>Free result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TOOLS.map((row) => (
                      <tr key={row.name}>
                        <td className={td}>
                          <span className={`block font-medium ${row.name === 'Cover Me' ? 'text-brand-light' : 'text-foreground'}`}>{row.name}</span>
                          <span className="text-[12.5px]">
                            {row.sources.map((s, i) => (
                              <span key={s.href}>
                                {i > 0 && ', '}
                                {s.href.startsWith('/') ? <Link href={s.href} className={link} aria-label={`${row.name} ${s.label.toLowerCase()} page`}>{s.label}</Link> : <a href={s.href} className={link} aria-label={`${row.name} ${s.label.toLowerCase()} page`} {...ext}>{s.label}</a>}
                              </span>
                            ))}
                          </span>
                        </td>
                        <td className={td}>{row.limit}</td>
                        <td className={td}>{row.account}</td>
                        <td className={td}>{row.posting}</td>
                        <td className={td}>{row.result}</td>
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
              Jobscan&rsquo;s <a href={SRC.jobscanPlan} {...ext}>plan page</a> gives a free account 5 resume scans a month. Each scan compares your resume with a job description you paste in. The free result has searchability tips and a short list of skills, and the full skills list and formatting checks are on Premium, according to Jobscan&rsquo;s <a href={SRC.jobscanPremium} {...ext}>Premium page</a>. In the test it gave a 79% match rate and flagged Salesforce, SQL and Tableau, but it didn&rsquo;t list Gainsight as a skill at all, and it reported that the posting asked for no particular years of experience when it asked for 4+. AI rewriting and the cover letter writer are paid only. Premium is $49.95 a month, or $89.95 every 3 months. Jobscan&rsquo;s <a href={SRC.jobscanRescan} {...ext}>help center</a> says a rescan after you edit counts as a new scan, so one job can use several, and that you can earn more free scans through Jobscan Rewards. The <Link href="/guides/jobscan-review">Jobscan review</Link> covers what its match rate measures, and the <Link href="/guides/free-jobscan-alternatives">free Jobscan alternatives</Link> guide compares tools that also rewrite the resume.
            </p>
          ),
        },
        {
          title: '2. SkillSyncer: the highest stated scan limit with an account',
          body: (
            <p>
              SkillSyncer&rsquo;s <a href={SRC.skillsyncer} {...ext}>pricing page</a> gives the free plan 2 job match scans a week, 10 AI credits a week and 1 resume, with no card needed. On the free plan, a scan shows a match score, the skills and keywords you&rsquo;re missing, whether your job title and degree match, and checks on accomplishments, word count and contact details. The word choice and date formatting checks are on Premium. In the test it gave a 70% match and flagged Salesforce, SQL and Tableau, but not Gainsight, and it suggested adding &ldquo;Analytics&rdquo; and &ldquo;Test&rdquo;, which came from the company&rsquo;s name and the posting&rsquo;s last line. The AI credits pay for rewrites of your bullets, and you approve each change. Premium is $14.95 a month, or $34.86 every 3 months, with unlimited scans.
            </p>
          ),
        },
        {
          title: '3. Teal: a keyword check inside a free job tracker',
          body: (
            <p>
              Teal&rsquo;s free plan, on its <a href={SRC.teal} {...ext}>pricing page</a>, shows the top 5 keywords from a job description and a basic analysis of your resume. Teal+ shows every keyword. In the test, the free Job Matcher gave a 60% match and showed 5 keywords, all of them ones the resume already had, including &ldquo;Accounting&rdquo;, which the posting never mentions. The 15 keywords it hid behind Teal+ included all 4 that were missing. The free plan also has AI credits: 5 for resume bullets, 2 for summaries and 2 for cover letters. Teal+ is $13 every 7 days, $29 every 30 days or $79 every 90 days. The checker is worth it mainly if you already track jobs in Teal. The <Link href="/guides/teal-review">Teal review</Link> covers its job board and what users say.
            </p>
          ),
        },
        {
          title: '4. Resume Worded: a free score, with the details on Pro',
          body: (
            <p>
              Resume Worded&rsquo;s Score My Resume needs a free account and shows your score and top issues for free, according to its <a href={SRC.resumeWordedUpload} {...ext}>upload page</a>. Its Targeted Resume tool scores your resume against one job description. In the test it gave a relevancy score of 81 and listed all 4 missing keywords on the free plan, along with &ldquo;Analytics&rdquo; from the company&rsquo;s name and &ldquo;Sales&rdquo;. The <a href={SRC.resumeWordedPro} {...ext}>Pro page</a> lists the full Targeted Resume report and the AI bullet writer as Pro features, at $49 a month, $99 every 3 months or $229 a year. It also reviews LinkedIn profiles.
            </p>
          ),
        },
        {
          title: '5. Enhancv: 27 checks, with or without a job',
          body: (
            <p>
              Enhancv&rsquo;s <a href={SRC.enhancv} {...ext}>resume checker</a> runs 27 checks on a PDF or Word resume up to 2 MB and gives a score with a task list. Paste a job description and it adds which of the job&rsquo;s skills and keywords you have and which you&rsquo;re missing. In the test it asked for no account or email. The resume scored 80 out of 100 on its own and 64 once the posting was added. The free view listed Salesforce and SQL as missing, and also Zendesk, which is on the resume; the rest of the list needs Pro. Enhancv&rsquo;s <a href={SRC.enhancvPricing} {...ext}>pricing page</a> lists its free resume builder plan as valid for 7 days. The checker suggests AI rewrites of weak bullets but doesn&rsquo;t apply them to your file.
            </p>
          ),
        },
        {
          title: '6. Resume.io: 16 checks, with an email sign-up',
          body: (
            <p>
              Resume.io&rsquo;s <a href={SRC.resumeIo} {...ext}>ATS checker</a> runs 16 checks on how well software can read your resume, how strong the content is and how well it matches a job. You enter an email to see the results, and Resume.io uses it to make an account you sign in to with an emailed link. Add a job description and it gives a second score for how well you match the role. I couldn&rsquo;t test it: its upload didn&rsquo;t respond in the test browser. The page says &ldquo;max 2MB&rdquo; in one place and &ldquo;max 10MB&rdquo; in another, so keep the file under 2 MB.
            </p>
          ),
        },
        {
          title: '7. Rezi: a free score that moves your resume into its template',
          body: (
            <p>
              Rezi&rsquo;s <a href={SRC.rezi} {...ext}>resume checker</a> is free with a Rezi account. It reads a PDF or Word file up to 2 MB, rebuilds it in a one-column template and scores it out of 100 on up to 23 checks, or 27 with Pro. A job description is optional. In the test it listed all 4 missing keywords for free and hid 10 more behind Pro. Its 64 is a score for the resume itself, not the match. The import also dropped both start dates, turning &ldquo;March 2022 to present&rdquo; into &ldquo;March 2022&rdquo;, so check the rebuilt resume before you download it. The free plan on Rezi&rsquo;s <a href={SRC.reziPricing} {...ext}>pricing page</a> allows 1 resume and 3 PDF downloads. Pro is $29 a month or $57 every 3 months, and Lifetime is $149 once. <Link href="/guides/cover-me-vs-rezi">Cover Me vs Rezi</Link> compares the two approaches.
            </p>
          ),
        },
        {
          title: '8. ResyMatch: a first scan with no account, job description required',
          body: (
            <p>
              ResyMatch, from Cultivated Culture, compares your resume with a job description, which it requires. Its <a href={SRC.resyMatch} {...ext}>scanner page</a> says a free account gets 7 credits a month. In the test, the first scan ran with no account and showed the score and the top 5 skill gaps; the rest of the list needed a free account. You can paste your resume or upload a PDF, Word or text file. It gave a 41% match and flagged Salesforce, SQL and Tableau but not Gainsight. It read the PDF with the lines run together, then marked QBRs and account management as missing even though both are on the resume. The Unlimited plan is $7 a week.
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
          title: '10. Cover Me: no account, 25 scans a day',
          body: (
            <>
              <p>
                Cover Me&rsquo;s <Link href="/ats-checker">free ATS resume checker</Link> needs no account or email. You paste a job posting, then paste your resume or upload a PDF or Word file. It gives an <Link href="/guides/what-is-an-ats-score">ATS match score</Link> out of 100 and lists the must-have and nice-to-have keywords it finds in the posting, with where each one appears in your resume. It also checks hard requirements such as years of experience, whether the job title is on your resume, your contact details and page count, and which bullets have a number. You can run it 25 times a day, a limit set in its <a href={SRC.coverMeLimit} {...ext}>open-source code</a>. In the test it gave 63 out of 100 and flagged all 4 missing keywords. It matched &ldquo;quarterly business reviews&rdquo; to QBRs and didn&rsquo;t count HubSpot or Looker. It also listed sales collaboration and expansion as missing nice-to-haves, which the posting does mention.
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
              For a check against one posting with no sign-up, use Cover Me&rsquo;s checker, which found every gap in the test. If you&rsquo;ll make an account, Resume Worded also found every gap and showed them for free. SkillSyncer states the highest scan limit at 2 a week, and its AI credits rewrite bullets, but check its list for words taken from the company&rsquo;s name. Jobscan&rsquo;s 5 a month suit a handful of important applications. If you&rsquo;d rather check the resume&rsquo;s format with no job in mind, Enhancv and Rezi both do that. Whichever you use, add only keywords that are true of you: the <Link href="/guides/tailor-resume-to-job-description">guide to tailoring your resume</Link> shows how, and the <Link href="/guides/ats-friendly-resume-format">ATS format test</Link> shows which layouts real ATSs misread.
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
