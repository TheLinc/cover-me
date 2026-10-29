import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { CHROME_STORE_URL } from '@/lib/utils'
import { getGuide, guideArticleJsonLd, guideBreadcrumbJsonLd } from '@/lib/guides'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'
const guide = getGuide('what-is-an-ats-score')
const HERO_IMAGE = '/guides/what-is-an-ats-score.png'
const HERO_ALT =
  "Infographic: what is an ATS score? It is your resume's match percentage against one job description. A resume and a job description produce a score of 85%, a strong match, with React and TypeScript matched and Kubernetes flagged as a gap. The same resume scores differently for every role."

export const metadata: Metadata = {
  title: 'What Is an ATS Score? How Resume Screening Works',
  description: "An ATS score estimates how well your resume matches one job description's keywords and requirements. See what a good score is, how to raise it honestly, and how Cover Me calculates it.",
  alternates: { canonical: `${BASE}/guides/${guide.slug}` },
  openGraph: {
    title: 'What Is an ATS Score? | Cover Me',
    description: 'How applicant tracking systems filter resumes, what a good match score looks like, and how to raise yours before you apply.',
    url: `${BASE}/guides/${guide.slug}`,
    siteName: 'Cover Me',
    type: 'article',
    images: [{ url: `${BASE}/guides/what-is-an-ats-score.png`, width: 1672, height: 941, alt: "What is an ATS score? Your resume's match percentage against one job description." }],
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
          What is an ATS score?
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
          width={1672}
          height={941}
          priority
          sizes="(max-width: 800px) 100vw, 760px"
          className="w-full h-auto rounded-[12px] border border-border"
        />
      </figure>

      <article className="space-y-5 text-[15.5px] text-muted-foreground leading-[1.85]">
        {/* Definition: direct answer for snippets */}
        <p className="text-[17px] text-foreground font-medium leading-[1.7]">
          An ATS score is a number, usually out of 100, that estimates how closely your resume matches one job description&rsquo;s keywords, skills, and requirements. A higher score means your resume is more likely to show up when a recruiter searches the applicant tracking system (ATS) for the terms that matter for that role.
        </p>
        <p>
          The score belongs to a resume and a posting together. The same resume scores differently against every job.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">How does ATS screening work?</h2>
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
          <a href="https://huntr.co/research/job-search-trends-q2-2025" target="_blank" rel="noopener noreferrer" className="text-brand-light hover:text-brand transition-colors">2.1 times as often</a>
          , 5.75% against 2.68%.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">What counts as a good ATS score?</h2>
        <p>
          These bands are rules of thumb. No ATS publishes a cutoff.
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong className="text-foreground">80 or higher.</strong> A strong match. Your resume uses the posting&rsquo;s language and should come up in recruiter searches.</li>
          <li><strong className="text-foreground">60 to 79.</strong> A decent match with visible gaps. Tailor before you submit, since a few rewritten bullets often close the distance.</li>
          <li><strong className="text-foreground">Below 50.</strong> The resume needs real tailoring for this role, or the role isn&rsquo;t a fit. Both are worth knowing before you spend time applying.</li>
        </ul>
        <p>
          Don&rsquo;t chase 100. A resume stuffed with every keyword reads as spam to the person who eventually opens it, and that person decides who gets an interview.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">How do you improve your ATS score?</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li>Read the posting and note the skills, tools, and qualifications it repeats or lists as required. Those are the terms recruiters filter by.</li>
          <li>Use the posting&rsquo;s exact wording where it truthfully describes your experience: &ldquo;React&rdquo; instead of &ldquo;modern JavaScript frameworks&rdquo;, &ldquo;stakeholder management&rdquo; instead of &ldquo;worked with teams&rdquo;.</li>
          <li>Rewrite your most relevant bullets to lead with the matched skills, and keep your real results and numbers.</li>
          <li>Never add a skill you don&rsquo;t have. A keyword that gets you the interview and falls apart in the room costs more than the filter did.</li>
          <li>Check the score again after tailoring, and close the remaining gaps where you honestly can.</li>
        </ol>
        <p>
          Our <Link href="/guides/tailor-resume-to-job-description" className="text-brand-light hover:text-brand transition-colors">guide to tailoring your resume to a job description</Link> covers each step in detail.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">How does Cover Me calculate its ATS score?</h2>
        <p>
          <Link href="/" className="text-brand-light hover:text-brand transition-colors">Cover Me (cover-me.dev)</Link> is an open-source Chrome extension that tailors your resume to the posting you have open and scores the result. The AI never makes up the number. It reports which of the posting&rsquo;s keywords your tailored resume covers, sorted into must-haves and nice-to-haves, plus any hard requirements you don&rsquo;t meet. Code then calculates the score:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Must-have keywords are worth 70 points, split by how many you cover.</li>
          <li>Nice-to-have keywords are worth 30 points, split the same way.</li>
          <li>Each unmet hard requirement, such as a license or a years-of-experience minimum, subtracts 10 points, up to 25 in total.</li>
          <li>A years requirement you meet doesn&rsquo;t count as a gap, and &ldquo;Tableau or Power BI&rdquo; counts as covered when your resume has either one.</li>
        </ul>
        <p>
          Because code does the math, the same keyword coverage always gives the same score, and the score only goes up as you cover more keywords. Every keyword you&rsquo;re missing is listed as a gap. The scoring code is public in{' '}
          <a href="https://github.com/TheLinc/cover-me/blob/master/extension/src/lib/ai/ats-score.ts" target="_blank" rel="noopener noreferrer" className="text-brand-light hover:text-brand transition-colors">ats-score.ts</a>
          {' '}on GitHub.
        </p>
        <p>
          Tailoring and scoring take one click on LinkedIn, Indeed, Greenhouse, Lever, Workday, and Ashby, and you can paste a posting from any other site. Before you see the result, a check removes any skill or claim your original resume doesn&rsquo;t support, so a higher score never comes from invented experience.
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
        <h2 className="text-[20px] text-foreground mb-2">See your ATS score on any job posting</h2>
        <p className="text-[14px] text-muted-foreground mb-5 max-w-[420px] mx-auto leading-[1.7]">
          Cover Me tailors your resume to the role, then shows your match score and every missing keyword.
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
