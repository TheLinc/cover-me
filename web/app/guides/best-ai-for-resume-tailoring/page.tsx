import type { Metadata } from 'next'
import Link from 'next/link'
import { GuideArticle, GuideFigure, ext } from '@/components/site/GuideArticle'
import { getGuide } from '@/lib/guides'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'
const guide = getGuide('best-ai-for-resume-tailoring')

export const metadata: Metadata = {
  title: { absolute: 'Best AI for Resume Tailoring (2026): 6 Tools Tested' },
  description: guide.description,
  alternates: { canonical: `${BASE}/guides/${guide.slug}` },
  openGraph: {
    title: 'Best AI for resume tailoring: 6 tools tested for made-up claims',
    description: 'Three resumes that lacked what the posting asked for, six AI tools, and a blind check of every claim they wrote.',
    url: `${BASE}/guides/${guide.slug}`,
    siteName: 'Cover Me',
    type: 'article',
    images: [{ url: `${BASE}${guide.image}`, width: 1600, height: 900, alt: 'Sendable tailored resumes and false or misleading claims for six AI tools' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Best AI for resume tailoring: 6 tools tested for made-up claims',
    description: 'Three resumes that lacked what the posting asked for, six AI tools, and a blind check of every claim they wrote.',
    images: [`${BASE}${guide.image}`],
  },
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Which AI is best for tailoring a resume?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "In a test on November 26, 2026, with three resumes that lacked what the posting asked for, Cover Me was the only tool whose three tailored resumes had no false or misleading claim. ChatGPT and Claude each made one of three resumes misleading. Jobscan's AI Optimize, with every suggestion accepted, added a false claim to all three resumes, and Teal's AI summaries misstated the applicants' years of experience. The author builds Cover Me, one of the tools tested, and three cases are enough for examples, not percentages.",
      },
    },
    {
      '@type': 'Question',
      name: 'Do AI resume builders make things up?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Some do. In a test on November 26, 2026, with three resumes that lacked what the posting asked for, Jobscan's AI Optimize wrote \"Developed E-Commerce marketing sites\" for a developer with no e-commerce work, and Teal summed up a nurse with four years as an RN as having \"1 year of experience in Acute Care\". Read every line of a tailored resume against your original before you send it.",
      },
    },
    {
      '@type': 'Question',
      name: 'Is Claude or ChatGPT better for resume writing?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Close. In a test on November 26, 2026, with three resumes that lacked what the posting asked for, neither added the main requirements the resume lacked, such as Redux, Kubernetes or ACLS, and both named the gaps. Claude's resumes scored a little higher on writing, but one kept an instruction to the user in a bullet: \"(add a specific test and result here if you have one)\". ChatGPT's added stretches of its own, such as \"experience building high-traffic interfaces\". For cover letters, Claude wrote the best letters of any tool.",
      },
    },
    {
      '@type': 'Question',
      name: 'Is it OK to use AI to tailor your resume?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Yes, if everything it writes is true. Using the posting's words for experience you really have is what tailoring is. The risk is a tool that adds a skill, a number or a number of years you can't back up in an interview or a reference check, so check the output line by line.",
      },
    },
    {
      '@type': 'Question',
      name: "Is Jobscan's AI Optimize accurate?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: "In a test on November 26, 2026, with the default Fast optimization and every suggestion accepted, it added a claim the resume didn't support to each of three resumes, such as WCAG 2.1 AA compliance for a developer whose resume shows only Lighthouse scores. Jobscan shows its edits as suggestions you can reject one by one, so a careful user can keep only the true ones.",
      },
    },
  ],
}

const RESUMES = [
  { tool: 'Cover Me', docs: '3', high: '0', medium: '0', sendable: '3 of 3', quality: '4.0' },
  { tool: 'Claude', docs: '3', high: '0', medium: '1', sendable: '2 of 3', quality: '3.7' },
  { tool: 'ChatGPT', docs: '3', high: '0', medium: '1', sendable: '2 of 3', quality: '3.3' },
  { tool: 'Rezi', docs: '1', high: '0', medium: '0', sendable: '1 of 1', quality: '3.0' },
  { tool: 'Jobscan', docs: '3', high: '4', medium: '3', sendable: '0 of 3', quality: '2.0' },
  { tool: 'Teal', docs: '2', high: '3', medium: '2', sendable: '0 of 2', quality: '1.5' },
]

const LETTERS = [
  { tool: 'Claude', docs: '3', high: '0', medium: '1', sendable: '2 of 3', quality: '4.3' },
  { tool: 'Teal', docs: '2', high: '2', medium: '0', sendable: '0 of 2', quality: '3.5' },
  { tool: 'Cover Me', docs: '3', high: '0', medium: '0', sendable: '3 of 3', quality: '3.0' },
  { tool: 'ChatGPT', docs: '3', high: '0', medium: '0', sendable: '3 of 3', quality: '3.0' },
  { tool: 'Jobscan', docs: '3', high: '2', medium: '1', sendable: '1 of 3', quality: '2.3' },
]

function ResultsTable({ rows, caption }: { rows: typeof RESUMES; caption: string }) {
  const th = 'border-b border-line px-4 py-3 text-left font-bold text-muted-foreground'
  const td = 'border-b border-line px-4 py-3 text-muted-foreground'
  return (
    <GuideFigure caption={caption}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] overflow-hidden rounded-[8px] border border-line bg-white text-[14px]" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr className="bg-paper">
              <th className={th}>Tool</th>
              <th className={th}>Tested</th>
              <th className={th}>False claims</th>
              <th className={th}>Misleading claims</th>
              <th className={th}>Sendable</th>
              <th className={th}>Writing (1 to 5)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.tool} className={i % 2 === 0 ? 'bg-surface' : 'bg-paper'}>
                <td className={`${td} whitespace-nowrap font-medium text-foreground`}>{r.tool}</td>
                <td className={td}>{r.docs}</td>
                <td className={td}>{r.high}</td>
                <td className={td}>{r.medium}</td>
                <td className={td}>{r.sendable}</td>
                <td className={td}>{r.quality}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GuideFigure>
  )
}

export default function Page() {
  return (
    <GuideArticle
      guide={guide}
      lede={
        <>
          On November 26, 2026 I gave Cover Me, ChatGPT, Claude, Rezi, Jobscan and Teal three resumes that lacked what the job posting asked for, and a blind scorer checked every claim they wrote. Of the tools tested on all three resumes, Cover Me was the only one with no false or misleading claim. Jobscan&rsquo;s AI Optimize, with every suggestion accepted, put a false claim into every resume it tailored, and so did Teal&rsquo;s AI summaries.
        </>
      }
      tldr={[
        'Of the tools tested on all three resumes, Cover Me was the only one with no false or misleading claim. Rezi also had none, but its free plan allowed only one resume.',
        "ChatGPT and Claude didn't add the big missing requirements, such as Redux, Kubernetes or ACLS, and both named the gaps. Each still made one of three resumes misleading.",
        'Jobscan\'s AI Optimize, with every suggestion accepted, added a false claim to all three resumes. Teal\'s AI summaries misstated the years of experience.',
        "For cover letters, Claude wrote the best ones but implied Kubernetes experience the applicant doesn't have. Cover Me's letters were plain, and one had a small made-up detail.",
      ]}
      intro={
        <p>
          I build Cover Me, one of the six tools, so read this with that in mind. Every quote from a tool below is copied from its own output, and I&rsquo;ve kept in the places where Cover Me lost: it didn&rsquo;t write the best cover letters, and one of its letters had a line the resume doesn&rsquo;t support. I ran everything on November 26, 2026.
        </p>
      }
      sections={[
        {
          title: 'How I tested the six tools',
          body: (
            <>
              <p>
                Three made-up applicants, each applying for a real-looking job that asks for things their resume doesn&rsquo;t have. That gap is where tailoring tools go wrong: the easy way to raise a match score is to borrow the posting&rsquo;s requirements. The three resumes and postings are public in{' '}
                <a href="https://github.com/TheLinc/cover-me/blob/ca5615324b319bd4aa8ed4d81385aff574e35a56/extension/eval/fixtures.ts#L273" {...ext}>Cover Me&rsquo;s test cases on GitHub</a>, so you can run them through any tool yourself.
              </p>
              <ul>
                <li>A frontend developer with 6 years of React, applying for a Senior Frontend Engineer job that wants Redux, Kubernetes and e-commerce experience.</li>
                <li>A medical-surgical nurse with 4 years as an RN, applying for an ICU job that wants ACLS, CCRN, Cerner and critical care.</li>
                <li>A content marketer applying for a Growth Marketing Manager job at a fintech that wants Meta Ads, ROAS and B2B SaaS.</li>
              </ul>
              <p>
                In ChatGPT and Claude I typed what most people would: &ldquo;Tailor my resume to this job posting.&rdquo; or &ldquo;Write a cover letter for this job using my resume.&rdquo;, then pasted the posting and the resume, one fresh chat per request. ChatGPT ran on a free account in a temporary chat with its default model. Claude ran Sonnet 5.5, the model on its free plan. The other tools ran with their default settings:
              </p>
              <ul>
                <li>Cover Me: built from its main branch on November 26 (version 1.10.0 plus unreleased changes), on a Pro account, posting pasted in, default options. It uses the same Claude Sonnet 5.5 model as the Claude chat.</li>
                <li>Jobscan: the Premium trial, AI Optimize with the default Fast setting. Jobscan shows its edits as suggestions, and I scored what &ldquo;Accept All&rdquo; would produce.</li>
                <li>Teal: a free account. Free AI credits ran out after two cover letters and two AI summaries, so the marketing case has neither.</li>
                <li>Rezi: a free account, which allows one AI conversation, so only the developer resume. Rezi offers its changes as checkboxes; I ticked both of its suggested optimizations, one of which the resume doesn&rsquo;t support, and left the four gaps unticked. Its cover letters are paid only.</li>
              </ul>
              <p>
                A separate Claude session scored the 29 documents without knowing which tool wrote which. For each one it listed every claim the resume doesn&rsquo;t support, rated how bad it is, and scored the writing from 1 to 5. A false claim is one a recruiter or a reference check would catch. A misleading one is close to the truth but overstated. A document is sendable if it has neither and no leftover placeholder.
              </p>
              <p>
                The limits: three cases with one run each is enough for examples, not percentages. The scorer is a Claude model, and both Cover Me and the Claude chat run on Claude. It also missed one line in a Cover Me letter that I caught by hand, which is in the cover letter section below.
              </p>
            </>
          ),
        },
        {
          title: 'Which AI is best for tailoring a resume?',
          body: (
            <>
              <p>
                In this November 26, 2026 test with three resumes, Cover Me was the most accurate: all three of its tailored resumes were sendable, with no false or misleading claim and the best writing score, 4.0 out of 5. Rezi&rsquo;s one resume had no false claim either, but its free plan allowed only one. Claude and ChatGPT came close. Jobscan and Teal added a false claim to every resume.
              </p>
              <ResultsTable
                rows={RESUMES}
                caption="Tailored resumes, scored blind on November 26, 2026. Teal's are the imported resume plus its AI summary, on the free plan, and Rezi's free plan allowed one resume. Leftover placeholders aren't counted as claims: Claude left one in a bullet, which makes that resume not sendable, and Jobscan's editor had 5 empty fields, such as a blank GPA line, that probably don't export. Each Jobscan resume has a false claim without them."
              />
              <h3>Cover Me</h3>
              <p>
                All three resumes kept the facts of every bullet and added none of the missing requirements. Under &ldquo;Missing&rdquo;, each result lists what the posting wants and the resume lacks: Redux, Kubernetes and CI/CD for the developer, ACLS, critical care, CCRN and Cerner for the nurse, and Meta Ads, ROAS and attribution for the marketer. The cost of that is a modest score: the ATS match went from 60 to 63, 54 to 54, and 48 to 60. It won&rsquo;t raise the number with skills you don&rsquo;t have. <Link href="/guides/what-is-an-ats-score">What an ATS score measures</Link> explains why a lower true score beats a higher false one.
              </p>
              <p>
                Three small flaws: the nurse&rsquo;s list named ACLS twice, the marketer&rsquo;s list said the posting wants 3+ years of growth work and the applicant has about 1, though the resume shows Google Ads campaigns since January 2023, and the marketer&rsquo;s summary ended on the odd phrase &ldquo;to a first growth hire&rdquo;.
              </p>
              <h3>Claude and ChatGPT</h3>
              <p>
                Neither chatbot claimed Redux, Kubernetes, ACLS, Meta Ads or the other headline requirements in a resume. Both pointed out the gaps and told the applicant not to claim them. Their problems were smaller, and some still borrowed from the posting: ChatGPT added an &ldquo;Interdisciplinary collaboration&rdquo; skill to the nurse&rsquo;s resume, echoing the posting&rsquo;s interdisciplinary rounds. Claude left an instruction inside a bullet in the marketing resume: &ldquo;A/B test campaigns and content to improve engagement and conversion (add a specific test and result here if you have one)&rdquo;, and turned &ldquo;segmenting sends&rdquo; into &ldquo;Built lifecycle email programs in HubSpot&rdquo;. ChatGPT described a developer whose dashboards serve 60,000 monthly users as having &ldquo;experience building high-traffic interfaces&rdquo;, echoing the posting&rsquo;s &ldquo;high-traffic consumer products&rdquo;. Both return chat text, so you still copy it into a document and format it yourself.
              </p>
              <h3>Rezi AI</h3>
              <p>
                Rezi declined the one unsupported change it was asked to apply: its accessibility suggestion &ldquo;was not applied because your current resume references Lighthouse scores rather than WCAG specifically, and unverified requirements cannot be added.&rdquo; That&rsquo;s the right call. With one resume on the free plan, though, there isn&rsquo;t much to judge. <Link href="/guides/cover-me-vs-rezi">Cover Me vs Rezi</Link> covers what else differs.
              </p>
              <h3>Jobscan AI Optimize</h3>
              <p>
                AI Optimize added a claim the resume doesn&rsquo;t support to every resume. The developer, who builds analytics dashboards, got &ldquo;Developed E-Commerce marketing sites and internal tools in React&rdquo; and a bullet ending &ldquo;ensuring compliance with WCAG 2.1 AA standards&rdquo;. The med-surg nurse got &ldquo;post-surgical discharge planning and critical care transitions&rdquo;. The marketer got &ldquo;to support brand storytelling and B2B awareness&rdquo;. Each one borrows from the posting and writes it into the applicant&rsquo;s past. Jobscan does let you reject suggestions one at a time, so a careful user can avoid this. The <Link href="/guides/jobscan-review">Jobscan review</Link> covers its prices and match rate.
              </p>
              <h3>Teal AI resume builder</h3>
              <p>
                On the free plan, Teal&rsquo;s AI wrote a summary for the resume, and both summaries misstated the basic facts. The developer, with six years of experience, became a &ldquo;Frontend Engineer with 2+ years of experience&rdquo; who &ldquo;Achieved significant performance improvements in under 3 months&rdquo;, a timeframe the resume never gives. The nurse, with four years as an RN, became a &ldquo;Dedicated nurse with 1 year of experience in Acute Care. Proficient in Continuous Monitoring and critical care environments&rdquo;, two things from the ICU posting. The <Link href="/guides/teal-review">Teal review</Link> covers what Teal+ costs.
              </p>
            </>
          ),
        },
        {
          title: 'Claude vs ChatGPT for resume writing',
          body: (
            <>
              <p>
                In this November 26, 2026 test, Claude and ChatGPT were close for tailoring a resume. Neither added the main requirements the resume lacked, both named the gaps, and each left one of three resumes misleading. Claude&rsquo;s resumes read a little better, 3.7 against 3.3 out of 5, and its cover letters were the best of any tool. ChatGPT&rsquo;s letters were accurate but leaned on stock phrases: the scorer counted 20 clichés across its three letters, against 10 for Claude&rsquo;s.
              </p>
              <p>
                Neither does the part after the writing. You paste the posting and resume into every chat, then copy the answer into a document and format it. If you&rsquo;d rather do it by hand, <Link href="/guides/chatgpt-resume-prompts">these ChatGPT resume prompts</Link> include one that checks the rewrite against your original for anything made up.
              </p>
            </>
          ),
        },
        {
          title: 'Cover letters: the best-written letter wasn’t the most accurate',
          body: (
            <>
              <p>
                Claude wrote the best cover letters in this test, 4.3 out of 5, but one of them implied experience the resume doesn&rsquo;t have. By the scorer&rsquo;s count, Cover Me and ChatGPT were the only tools whose letters were all sendable, though I found one made-up detail it missed in a Cover Me letter.
              </p>
              <ResultsTable rows={LETTERS} caption="Cover letters, scored blind on November 26, 2026. Rezi's letters are paid only, and Teal's free credits ran out after two. Not counted: one made-up detail in a Cover Me letter that the scorer missed, described below." />
              <p>
                Claude wrote the strongest letters, and one of them still stretched the truth: &ldquo;I also work in Node.js and am eager to deepen my Kubernetes and CI/CD experience&rdquo;. You can only deepen experience you already have, and the resume has none. Teal&rsquo;s letter for the same developer was upfront that &ldquo;I haven&rsquo;t deployed to Kubernetes myself&rdquo;, then claimed &ldquo;I&rsquo;ve worked closely with CI/CD pipelines&rdquo;, which the resume doesn&rsquo;t mention. Jobscan&rsquo;s letter gave the nurse &ldquo;two years of experience as a Staff Nurse&rdquo;, when the resume shows four, and wrote that &ldquo;The responsibilities of delivering critical care&rdquo; align with the posting, though the resume shows no critical care work.
              </p>
              <p>
                Cover Me&rsquo;s letters had no false claim the scorer found and no clichés, but they scored 3.0 for writing, below Claude&rsquo;s 4.3. The scorer called them accurate but plain. They list what the applicant has done more than they make a case for the job. Its marketing letter wrote that click-through rate rose &ldquo;to 3.4%, up from where it started&rdquo; when the resume gives the starting figure, 2.1%. I also found one line the scorer missed, in the developer&rsquo;s letter: &ldquo;Dashboard views take most of my time at Halcyon, and the data layer is the smaller share.&rdquo; The resume doesn&rsquo;t say how the applicant splits their time. That&rsquo;s a made-up detail, even if it&rsquo;s a small one, and I&rsquo;m working on it.
              </p>
            </>
          ),
        },
        {
          title: 'A stress test: Teal’s bullet writer',
          body: (
            <p>
              Teal&rsquo;s Write Bullet tool offers keywords from the posting, including ones your resume lacks, and writes bullets with them. I picked three requirements the developer doesn&rsquo;t have, as someone chasing a higher match might. It wrote &ldquo;Led the implementation of Redux for state management across a React application, enhancing performance and scalability for over 900,000 monthly users within 4 months.&rdquo; and &ldquo;Optimized deployment processes using Kubernetes, reducing downtime by X%&rdquo;, with no warning that the resume shows neither. This is a test I set up on purpose, so it isn&rsquo;t in the tables, but it shows what happens when a tool does what you ask.
            </p>
          ),
        },
        {
          title: 'How to check any AI tool’s resume before you send it',
          body: (
            <>
              <ul>
                <li>Search the result for every requirement in the posting. Each one it contains should be something you&rsquo;ve really done.</li>
                <li>Check your years of experience and every number against your original resume. Teal&rsquo;s summaries got the years wrong in this test, and so did one of Jobscan&rsquo;s cover letters.</li>
                <li>Don&rsquo;t click Accept All. Read each suggested edit on its own.</li>
                <li>Look for leftover placeholders such as &ldquo;X%&rdquo; or &ldquo;add a result here&rdquo;.</li>
                <li>Ask whether you could talk about each line in an interview. If you couldn&rsquo;t, cut it.</li>
              </ul>
              <p>
                <Link href="/guides/tailor-resume-to-job-description">How to tailor your resume to a job description</Link> covers doing it by hand, without inventing anything.
              </p>
            </>
          ),
        },
      ]}
      faq={faqJsonLd}
      cta={{
        title: 'Tailor your resume without made-up skills',
        body: '10 free generations to start, then 5 a week. No credit card required.',
      }}
    />
  )
}
