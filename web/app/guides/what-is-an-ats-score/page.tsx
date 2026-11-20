import type { Metadata } from 'next'
import Link from 'next/link'
import { GuideArticle, GuideFigure } from '@/components/site/GuideArticle'
import { EXAMPLE, Hl, Label } from '@/components/landing/visuals'
import { getGuide } from '@/lib/guides'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'
const guide = getGuide('what-is-an-ats-score')

export const metadata: Metadata = {
  title: 'What Is an ATS Score? How Resume Screening Works',
  description: "An ATS score estimates how well your resume matches one job posting's keywords. See what a good score is, how to raise it, and how Cover Me calculates it.",
  alternates: { canonical: `${BASE}/guides/${guide.slug}` },
  openGraph: {
    title: 'What Is an ATS Score? | Cover Me',
    description: 'How applicant tracking systems filter resumes, what a good match score looks like, and how to raise yours before you apply.',
    url: `${BASE}/guides/${guide.slug}`,
    siteName: 'Cover Me',
    type: 'article',
    images: [{ url: `${BASE}/guides/what-is-an-ats-score.png`, width: 1600, height: 900, alt: "An 86 ATS match score worked out from must-have and nice-to-have keywords" }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'What Is an ATS Score? | Cover Me',
    description: 'How applicant tracking systems filter resumes, what a good match score looks like, and how to raise yours before you apply.',
    images: [`${BASE}/guides/what-is-an-ats-score.png`],
  },
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is a good ATS score?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'As a rule of thumb, 80 or higher out of 100 is a strong match for that posting, 60 to 79 has gaps worth fixing, and below 50 means the resume needs real tailoring or the role is not a fit. Scores are per posting: the same resume can score 85 for one job and 40 for another.',
      },
    },
    {
      '@type': 'Question',
      name: 'Do all companies use ATS software?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Most large employers do. Jobscan found that 97.4% of Fortune 500 companies use an applicant tracking system, and many startups use Greenhouse, Lever, or Ashby. Assume any online application goes into an ATS.",
      },
    },
    {
      '@type': 'Question',
      name: 'Can I check my ATS score for free?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. The Cover Me Chrome extension scores your resume against the job posting you have open and lists the missing keywords. It is free and unlimited with your own Claude or OpenAI API key, and the hosted free plan gives 10 generations to start, then 5 a week.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does a higher ATS score guarantee an interview?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. A match score estimates keyword coverage, and a person still decides who gets interviewed. A high score helps your resume show up when a recruiter searches, and the content still has to convince the person who reads it.',
      },
    },
  ],
}

function RewriteExample() {
  const { before, after: [a, k, b] } = EXAMPLE.bullets[0]
  return (
    <div className="flex flex-col gap-5 rounded-[12px] bg-white p-6 text-[15px] leading-[1.6] shadow-[0_20px_50px_-24px_rgba(30,27,75,0.25)] max-sm:p-4">
      <div className="space-y-2">
        <Label>Posting · {EXAMPLE.role} at {EXAMPLE.company}</Label>
        <p className="text-body">
          {EXAMPLE.posting[0].map((part) =>
            typeof part === 'string' ? part : part.text === k ? <Hl key={k}>{k}</Hl> : (part.text ?? part.k),
          )}
        </p>
      </div>
      <div className="grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Your bullet</Label>
          <p className="text-ink-2">{before}</p>
        </div>
        <div className="space-y-2">
          <Label>In the posting&rsquo;s words</Label>
          <p className="text-ink">{a}<Hl>{k}</Hl>{b}</p>
        </div>
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <GuideArticle
      guide={guide}
      lede={
        <>
          An ATS score is a number, usually out of 100, that estimates how closely your resume matches one job description&rsquo;s keywords, skills, and requirements. A higher score means your resume is more likely to show up when a recruiter searches the applicant tracking system (ATS) for the terms that matter for that role.
        </>
      }
      tldr={[
        "An ATS score, usually out of 100, measures how closely your resume matches one job posting's keywords, skills and requirements.",
        "As a rule of thumb, 80 or higher is a strong match, 60 to 79 has gaps worth fixing, and below 50 needs real tailoring.",
        "The same resume scores differently for every job. You raise it by using the posting's own words for skills you really have.",
      ]}
      intro={
        <p>
          The score belongs to a resume and a posting together. The same resume scores differently against every job.
        </p>
      }
      sections={[
        {
          title: 'How does ATS screening work?',
          id: 'how-ats-screening-works',
          body: (
            <>
              <p>
                An applicant tracking system is the software a company uses to collect and manage applications. Greenhouse, Lever, Workday, and Ashby are common ones. When you apply, the ATS parses your resume into fields like job titles, dates, skills, and education. Recruiters then search, filter, and sort that pool by the terms that matter for the role. Some systems add their own ranking on top.
              </p>
              <p>
                Many ATS never show recruiters a single score for your resume. The &ldquo;ATS score&rdquo; you see in resume tools is an estimate of the same thing a recruiter&rsquo;s search rewards: overlap between your wording and the posting&rsquo;s.
              </p>
              <p>
                You will often read that over 75% of resumes never reach a human. That figure gets repeated widely and is poorly sourced. The mechanism behind it is real, though. If a recruiter filters 400 applicants by &ldquo;React&rdquo; and &ldquo;TypeScript&rdquo; and your resume says &ldquo;built modern web front-ends&rdquo;, your resume won&rsquo;t come up in that search, however qualified you are.
              </p>
              <p>
                Matching the posting also pays off in results. Huntr analyzed over 1.39 million applications and found that people who tailored their resume reached the interview stage{' '}
                <a href="https://huntr.co/research/job-search-trends-q2-2025" target="_blank" rel="noopener noreferrer">2.1 times as often</a>
                , 5.75% against 2.68%.
              </p>
            </>
          ),
        },
        {
          title: 'What counts as a good ATS score?',
          body: (
            <>
              <p>
                These bands are rules of thumb. No ATS publishes a cutoff.
              </p>
              <ul>
                <li><strong>80 or higher.</strong> A strong match. Your resume uses the posting&rsquo;s language and should come up in recruiter searches.</li>
                <li><strong>60 to 79.</strong> A decent match with visible gaps. Tailor before you submit, since a few rewritten bullets often close the distance.</li>
                <li><strong>Below 50.</strong> The resume needs real tailoring for this role, or the role isn&rsquo;t a fit. Both are worth knowing before you spend time applying.</li>
              </ul>
              <p>
                Don&rsquo;t chase 100. A resume stuffed with every keyword reads as spam to the person who eventually opens it, and that person decides who gets an interview.
              </p>
            </>
          ),
        },
        {
          title: 'How do you improve your ATS score?',
          body: (
            <>
              <ol>
                <li>Read the posting and note the skills, tools, and qualifications it repeats or lists as required. Those are the terms recruiters filter by. The free <Link href="/ats-checker">ATS resume checker</Link> lists them and marks which ones your resume already has.</li>
                <li>Use the posting&rsquo;s exact wording where it truthfully describes your experience: &ldquo;React&rdquo; instead of &ldquo;modern JavaScript frameworks&rdquo;, &ldquo;stakeholder management&rdquo; instead of &ldquo;worked with teams&rdquo;.</li>
                <li>Rewrite your most relevant bullets to lead with the matched skills, and keep your real results and numbers.</li>
                <li>Never add a skill you don&rsquo;t have. A keyword that gets you the interview and falls apart in the room costs more than the filter did.</li>
                <li>Check the score again after tailoring, and close the remaining gaps where you honestly can.</li>
              </ol>
              <GuideFigure caption="Steps 2 and 3 on a sample posting: the bullet keeps its numbers and leads with the posting's own words.">
                <RewriteExample />
              </GuideFigure>
              <p>
                Our <Link href="/guides/tailor-resume-to-job-description">guide to tailoring your resume to a job description</Link> covers each step in detail. Keywords only count if the ATS can read your file, so check your format with our{' '}
                <Link href="/guides/ats-friendly-resume-format">test of six resume formats</Link>.
              </p>
            </>
          ),
        },
        {
          title: 'How does Cover Me calculate its ATS score?',
          body: (
            <>
              <p>
                <Link href="/">Cover Me (cover-me.dev)</Link> is an open-source Chrome extension that tailors your resume to the posting you have open and scores the result. The AI never makes up the number. It reports which of the posting&rsquo;s keywords your tailored resume covers, sorted into must-haves and nice-to-haves, plus any hard requirements you don&rsquo;t meet. Code then calculates the score:
              </p>
              <ul>
                <li>Must-have keywords are worth 70 points, split by how many you cover.</li>
                <li>Nice-to-have keywords are worth 30 points, split the same way.</li>
                <li>Each unmet hard requirement, such as a license or a years-of-experience minimum, subtracts 10 points, up to 25 in total.</li>
                <li>A years requirement you meet doesn&rsquo;t count as a gap, and &ldquo;Tableau or Power BI&rdquo; counts as covered when your resume has either one.</li>
              </ul>
              <p>
                Because code does the math, the same keyword coverage always gives the same score, and the score only goes up as you cover more keywords. Every keyword you&rsquo;re missing is listed as a gap. The scoring code is public in{' '}
                <a href="https://github.com/TheLinc/cover-me/blob/master/extension/src/lib/ai/ats-score.ts" target="_blank" rel="noopener noreferrer">ats-score.ts</a>
                {' '}on GitHub.
              </p>
              <p>
                Tailoring and scoring take one click on LinkedIn, Indeed, Greenhouse, Lever, Workday, and Ashby, and you can paste a posting from any other site. Before you see the result, a check removes any skill or claim your original resume doesn&rsquo;t support, so a higher score never comes from invented experience.
              </p>
            </>
          ),
        },
      ]}
      faq={faqJsonLd}
      cta={{
        title: 'See your ATS score on any job posting',
        body: 'Cover Me tailors your resume to the role, then shows your match score and every missing keyword.',
      }}
    />
  )
}
