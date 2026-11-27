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
    description: 'Three resumes that lacked what the posting asked for, six AI tools, and a check of every claim they wrote.',
    url: `${BASE}/guides/${guide.slug}`,
    siteName: 'Cover Me',
    type: 'article',
    images: [{ url: `${BASE}${guide.image}`, width: 1600, height: 900, alt: 'Sendable tailored resumes and false or misleading claims for six AI tools' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Best AI for resume tailoring: 6 tools tested for made-up claims',
    description: 'Three resumes that lacked what the posting asked for, six AI tools, and a check of every claim they wrote.',
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
        text: "Some do. In a test on November 26, 2026, with three resumes that lacked what the posting asked for, Jobscan's AI Optimize wrote \"Developed E-Commerce marketing sites\" for a developer with no e-commerce work, and Teal summed up a registered nurse with four years of experience as having \"1 year of experience in Acute Care\". Read every line of a tailored resume against your original before you send it.",
      },
    },
    {
      '@type': 'Question',
      name: 'Is Claude or ChatGPT better for resume writing?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Close. In a test on November 26, 2026, with three resumes that lacked what the posting asked for, neither added the main skills or certifications the resume lacked, such as the intensive care certifications the nurse didn't have, and both pointed out the gaps. Claude's resumes scored a little higher on writing, but one kept an instruction to the user in a bullet: \"(add a specific test and result here if you have one)\". ChatGPT's added stretches of its own, such as \"experience building high-traffic interfaces\". For cover letters, Claude wrote the best letters of any tool.",
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
        text: "In a test on November 26, 2026, on its standard setting and with every suggestion accepted, it added a claim the resume didn't support to each of three resumes, such as following a web accessibility standard the developer's resume never names. Jobscan shows its edits as suggestions you can reject one by one, so a careful user can keep only the true ones.",
      },
    },
  ],
}

const RESUMES = [
  { tool: 'Cover Me', docs: '3', high: '0', medium: '0', sendable: '3 of 3', quality: '4.0' },
  { tool: 'Claude', docs: '3', high: '0', medium: '1', sendable: '2 of 3', quality: '3.7' },
  { tool: 'ChatGPT', docs: '3', high: '0', medium: '1', sendable: '2 of 3', quality: '3.3' },
  { tool: 'Rezi', docs: '1', high: '0', medium: '0', sendable: '1 of 1', quality: '3.0' },
  { tool: 'Jobscan', docs: '3', high: '4', medium: '3', sendable: '0 of 3', quality: 'Not scored' },
  { tool: 'Teal', docs: '2', high: '2', medium: '2', sendable: '0 of 2', quality: '1.5' },
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
          On November 26, 2026 I gave Cover Me, ChatGPT, Claude, Rezi, Jobscan and Teal three resumes that lacked what the job posting asked for, and a scorer that didn&rsquo;t know which tool wrote what checked every claim. Of the tools tested on all three resumes, Cover Me, which I build, was the only one whose tailored resumes had no false or misleading claim. Jobscan&rsquo;s AI Optimize, with every suggestion accepted, put a false claim into every resume it tailored, and so did Teal&rsquo;s AI summaries.
        </>
      }
      tldr={[
        'Of the tools tested on all three resumes, Cover Me, which I build, was the only one whose tailored resumes had no false or misleading claim. Rezi also had none, but its free plan allowed only one resume.',
        "ChatGPT and Claude didn't add the big skills or certifications the applicants lacked, and both pointed out the gaps. Each still made one of three resumes misleading.",
        'Jobscan\'s AI Optimize, with every suggestion accepted, added a false claim to all three resumes. Teal\'s AI summaries misstated the years of experience.',
        "For cover letters, Claude wrote the best ones but implied technical experience the applicant doesn't have. Cover Me's letters were plain, and one had a small made-up detail.",
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
                I made up three job seekers. Each one applied for a realistic job that asks for things their resume doesn&rsquo;t have. That&rsquo;s where tailoring tools tend to go wrong: the easy way to raise a match score is to copy the job&rsquo;s requirements into the resume. The three resumes and job postings are{' '}
                <a href="https://github.com/TheLinc/cover-me/blob/ca5615324b319bd4aa8ed4d81385aff574e35a56/extension/eval/fixtures.ts#L273" {...ext}>published online</a>, so you can try them in any tool yourself.
              </p>
              <ul>
                <li>A web developer with 6 years of experience, applying for a senior job that wants Redux and Kubernetes, two technical tools the developer has never used, and experience building online stores.</li>
                <li>A nurse with 4 years on a general hospital ward, applying for an intensive care (ICU) job that wants two certifications the nurse doesn&rsquo;t hold, ACLS and CCRN, plus Cerner charting software and critical care experience.</li>
                <li>A content marketer applying for a growth marketing job at a startup that sells finance software to small businesses. The job wants Facebook and Instagram ads (Meta Ads), ROAS (return on ad spend) and experience at a finance or business software company.</li>
              </ul>
              <p>
                In ChatGPT and Claude I typed what most people would, &ldquo;Tailor my resume to this job posting&rdquo; or &ldquo;Write a cover letter for this job using my resume&rdquo;, then pasted in the job posting and the resume, starting a new chat each time. ChatGPT ran on a free account, and Claude used the same AI its free plan offers. The other tools ran on their standard settings:
              </p>
              <ul>
                <li>Cover Me: its newest version on a Pro account, with the job posting pasted in and the standard options. It runs on the same AI as the Claude chat.</li>
                <li>Jobscan: the Premium free trial, using its AI Optimize feature on the standard setting. Jobscan shows its changes as suggestions you accept or reject, and I counted the claims in what you&rsquo;d get by clicking &ldquo;Accept All&rdquo;. For two of its three resumes, the copy the scorer read showed Jobscan&rsquo;s removed and added words jumbled together, so I don&rsquo;t give Jobscan&rsquo;s resumes a writing score.</li>
                <li>Teal: a free account. Its free AI credits ran out after two cover letters and two resume summaries, so the marketer got neither.</li>
                <li>Rezi: a free account, which allows one AI chat, so only the developer&rsquo;s resume. Rezi lists its suggested changes for you to tick. I ticked both changes it recommended, one of which the resume doesn&rsquo;t back up, and left the four skills it said were missing unticked. Its cover letters are only on paid plans.</li>
              </ul>
              <p>
                To keep the scoring fair, I removed the tool names from all 29 resumes and letters and gave them to a separate AI, Claude, that didn&rsquo;t know which tool wrote which. It listed every claim the resume doesn&rsquo;t back up, rated how serious each one is, and scored the writing from 1 to 5. A false claim is one a recruiter or a reference check would catch. A misleading one is close to the truth but stretched. A resume or letter counts as sendable if it has neither and no unfinished placeholder text.
              </p>
              <p>
                The limits: three made-up job seekers, tried once each, give examples, not percentages. The scorer is Claude, and Cover Me, the Claude chat and, by default, Teal&rsquo;s cover letters all use Claude too. The scorer also missed one line in a Cover Me letter that I caught myself. It&rsquo;s in the cover letter section below.
              </p>
            </>
          ),
        },
        {
          title: 'Which AI is best for tailoring a resume?',
          body: (
            <>
              <p>
                In this November 26, 2026 test with three resumes, Cover Me, which I build, was the most accurate: all three of its tailored resumes were sendable, with no false or misleading claim and the best writing score, 4.0 out of 5. Rezi&rsquo;s one resume had no false claim either, but its free plan allowed only one. Claude and ChatGPT came close. Jobscan, with every suggestion accepted, and Teal added a false claim to every resume.
              </p>
              <ResultsTable
                rows={RESUMES}
                caption="Tailored resumes, scored on November 26, 2026 by a scorer that didn't know which tool wrote them. Teal's rows are the original resume plus the summary Teal's AI wrote, on the free plan, and Rezi's free plan allowed one resume. Unfinished placeholder text isn't counted as a claim: Claude left some in a bullet, one reason that resume isn't sendable, and Jobscan left 6 blank fields, such as an empty GPA line. Each Jobscan resume has a false claim without them. One Teal line isn't counted, as the Teal section explains."
              />
              <h3>Cover Me</h3>
              <p>
                All three resumes kept the facts of every bullet and added none of the missing requirements. Under &ldquo;Missing&rdquo;, each result lists what the posting wants and the resume lacks: Redux, Kubernetes and CI/CD for the developer, ACLS, critical care, CCRN and Cerner for the nurse, and Meta Ads, ROAS and attribution for the marketer. The cost is a modest match score, the number that estimates how well a resume fits the posting: it went from 60 to 63, 54 to 54, and 48 to 60. It won&rsquo;t raise the number with skills you don&rsquo;t have. <Link href="/guides/what-is-an-ats-score">What an ATS score measures</Link> explains why a lower true score beats a higher false one.
              </p>
              <p>
                Three small flaws: the nurse&rsquo;s list named ACLS twice, the marketer&rsquo;s list said the posting wants 3+ years of growth work and the applicant has about 1, though the resume shows Google Ads campaigns in a role held since January 2023, and the marketer&rsquo;s summary ended on the odd phrase &ldquo;to a first growth hire&rdquo;.
              </p>
              <h3>Claude and ChatGPT</h3>
              <p>
                Neither chatbot claimed Redux, Kubernetes, ACLS, Meta Ads or the other skills and certifications the posting asked for in a resume. Both pointed out the gaps and told the applicant not to claim them. Their problems were smaller, and some still borrowed from the posting: ChatGPT added an &ldquo;Interdisciplinary collaboration&rdquo; skill to the nurse&rsquo;s resume, echoing the posting&rsquo;s &ldquo;interdisciplinary rounds&rdquo;. Claude left an instruction inside a bullet in the marketing resume: &ldquo;A/B test campaigns and content to improve engagement and conversion (add a specific test and result here if you have one)&rdquo;, and opened the email bullet with &ldquo;Built lifecycle email programs in HubSpot&rdquo;, when the only thing the resume says the marketer did in HubSpot, an email tool, is split email sends into groups. ChatGPT described a developer whose dashboards serve 60,000 monthly users as having &ldquo;experience building high-traffic interfaces&rdquo;, echoing the posting&rsquo;s &ldquo;high-traffic consumer products&rdquo;. Both give you the text in a chat, so you still copy it into a document and format it yourself.
              </p>
              <h3>Rezi AI</h3>
              <p>
                Rezi declined the one change it couldn&rsquo;t back up. It had suggested naming a web accessibility standard, WCAG, then said the change &ldquo;was not applied because your current resume references Lighthouse scores rather than WCAG specifically, and unverified requirements cannot be added.&rdquo; That&rsquo;s the right call. With one resume on the free plan, though, there isn&rsquo;t much to judge. <Link href="/guides/cover-me-vs-rezi">Cover Me vs Rezi</Link> covers what else differs.
              </p>
              <h3>Jobscan AI Optimize</h3>
              <p>
                AI Optimize added a claim the resume doesn&rsquo;t support to every resume. The developer, who builds analytics dashboards, got &ldquo;Developed E-Commerce marketing sites and internal tools in React&rdquo; and a bullet ending &ldquo;ensuring compliance with WCAG 2.1 AA standards&rdquo;, a web accessibility standard the resume never names. The nurse, who has never worked in critical care, got &ldquo;post-surgical discharge planning and critical care transitions&rdquo;. The marketer got &ldquo;to support brand storytelling and B2B awareness&rdquo;. Each one borrows from the posting and writes it into the applicant&rsquo;s past. Jobscan does let you reject suggestions one at a time, and its editor warns &ldquo;AI helps improve your resume, but always review it to make sure it&rsquo;s correct&rdquo;, so a careful user can avoid this. I used only its standard &ldquo;Fast&rdquo; mode, not its two other modes. The <Link href="/guides/jobscan-review">Jobscan review</Link> covers its prices and match rate.
              </p>
              <h3>Teal AI resume builder</h3>
              <p>
                On the free plan, Teal&rsquo;s AI wrote a summary for the resume, and both summaries misstated the basic facts. The developer, with six years of experience, became a &ldquo;Frontend Engineer with 2+ years of experience&rdquo; who &ldquo;Achieved significant performance improvements in under 3 months&rdquo;, a timeframe the resume never gives. The nurse, with four years of nursing, became a &ldquo;Dedicated nurse with 1 year of experience in Acute Care&rdquo;. The same summary called the nurse &ldquo;Proficient in Continuous Monitoring and critical care environments&rdquo;, two things from the ICU posting, but those are also keywords I picked on Teal&rsquo;s job matching page for the stress test below, and I can&rsquo;t rule out that Teal used my picks, so I don&rsquo;t count that line. The <Link href="/guides/teal-review">Teal review</Link> covers what Teal+ costs.
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
          title: 'Cover letters: the best letter writer wasn’t the most accurate',
          body: (
            <>
              <p>
                Claude wrote the best cover letters in this test, 4.3 out of 5, but one of them implied experience the resume doesn&rsquo;t have. By the scorer&rsquo;s count, Cover Me and ChatGPT were the only tools whose letters were all sendable, though I found one made-up detail it missed in a Cover Me letter.
              </p>
              <ResultsTable rows={LETTERS} caption="Cover letters, scored on November 26, 2026 by a scorer that didn't know which tool wrote them. Rezi's letters are paid only, and Teal's free credits ran out after two. Not counted: one made-up detail in a Cover Me letter that the scorer missed, described below." />
              <p>
                Claude wrote the strongest letters, and one of them still stretched the truth: &ldquo;I also work in Node.js and am eager to deepen my Kubernetes and CI/CD experience&rdquo;. You can only deepen experience you already have, and the resume shows no Kubernetes or CI/CD, two kinds of technical setup work. Teal&rsquo;s letter for the same developer was upfront that &ldquo;I haven&rsquo;t deployed to Kubernetes myself&rdquo;, then claimed &ldquo;I&rsquo;ve worked closely with CI/CD pipelines&rdquo;, which the resume doesn&rsquo;t mention. Jobscan&rsquo;s letter gave the nurse &ldquo;two years of experience as a Staff Nurse&rdquo;, when the resume shows four, and wrote that &ldquo;The responsibilities of delivering critical care&rdquo; align with the posting, though the resume shows no critical care work.
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
              Teal&rsquo;s Write Bullet tool offers keywords from the posting, including ones your resume lacks, and writes bullets with them. I picked Redux, Kubernetes and state management, as someone chasing a higher match might. The developer has used neither Redux nor Kubernetes. It wrote &ldquo;Led the implementation of Redux for state management across a React application, enhancing performance and scalability for over 900,000 monthly users within 4 months.&rdquo; and &ldquo;Optimized deployment processes using Kubernetes, reducing downtime by X%&rdquo;, with no warning that the resume shows neither. This is a test I set up on purpose, so it isn&rsquo;t in the tables, but it shows what happens when a tool does what you ask.
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
                <li>Look for leftover placeholders such as &ldquo;X%&rdquo; or &ldquo;add a specific test and result here&rdquo;.</li>
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
