import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { CHROME_STORE_URL } from '@/lib/utils'
import { getGuide, guideArticleJsonLd, guideBreadcrumbJsonLd } from '@/lib/guides'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'
const guide = getGuide('what-is-an-ats-score')
const HERO_IMAGE = '/guides/what-is-an-ats-score.png'
const HERO_ALT =
  'Infographic: what is an ATS score? Your resume’s match percentage against a specific job description. A resume plus a job description produce an ATS match score — shown as 85%, a strong match, with React and TypeScript matched and Kubernetes flagged as a gap. The score is per-job, not permanent: the same resume scores differently for every role.'

export const metadata: Metadata = {
  title: 'What Is an ATS Score? How Resume Screening Works',
  description: 'An ATS score measures how well your resume matches a job description’s keywords and requirements. Learn what a good score is and how to improve yours before applying.',
  alternates: { canonical: `${BASE}/guides/${guide.slug}` },
  openGraph: {
    title: 'What Is an ATS Score? — Cover Me',
    description: 'How applicant tracking systems score resumes, what a good match looks like, and how to improve yours before you apply.',
    url: `${BASE}/guides/${guide.slug}`,
    siteName: 'Cover Me',
    type: 'article',
    images: [{ url: `${BASE}/guides/what-is-an-ats-score.png`, width: 1672, height: 941, alt: 'What is an ATS score? Your resume’s match percentage against a specific job description.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'What Is an ATS Score? — Cover Me',
    description: 'How applicant tracking systems score resumes, what a good match looks like, and how to improve yours before you apply.',
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
        text: 'A match of roughly 75–80% or higher against the job description is generally considered strong. Below about 50%, your resume is unlikely to surface in keyword-filtered searches. The score is relative to each specific posting — the same resume can score 85% for one role and 40% for another.',
      },
    },
    {
      '@type': 'Question',
      name: 'Do all companies use ATS software?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Nearly all large companies do — commonly cited research puts ATS usage above 97% of Fortune 500 companies — and most startups use systems like Greenhouse, Lever, or Ashby. Assume any online application passes through an ATS.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I check my ATS score for free?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. The Cover Me Chrome extension scores your resume against any job posting you have open and shows the specific keyword gaps — free with your own API key, or 5 generations per day on the hosted free tier.',
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
        <h1 className="text-[clamp(30px,4.5vw,46px)] font-extrabold tracking-[-1.8px] text-foreground leading-[1.02] mt-4 mb-4">
          What is an ATS score?
        </h1>
        <p className="text-[12px] text-muted-foreground">
          <time dateTime={guide.date}>Updated July 6, 2026</time> · Lincoln Laylor
        </p>
      </div>

      {/* Hero graphic */}
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
        {/* Definition — direct answer for snippets */}
        <p className="text-[17px] text-foreground font-medium leading-[1.7]">
          An ATS score is a percentage that measures how closely your resume matches a specific job description — the keywords, skills, and requirements an applicant tracking system (ATS) scans for when it filters candidates. A higher score means your resume is more likely to survive automated screening and reach a human recruiter.
        </p>

        <h2 className="text-[22px] font-bold text-foreground tracking-[-0.5px] !mt-10">How does ATS screening actually work?</h2>
        <p>
          An applicant tracking system is the software companies use to collect and manage applications — Greenhouse, Lever, Workday, and Ashby are common examples. When you apply online, your resume is parsed into structured data: job titles, dates, skills, education. Recruiters then search and filter that pool by the terms that matter for the role.
        </p>
        <p>
          The often-quoted statistic is that over 75% of resumes never reach a human because of this filtering. The precise number varies by study, but the mechanism is real: if a recruiter filters 400 applicants by &ldquo;React&rdquo; and &ldquo;TypeScript&rdquo; and your resume says &ldquo;built modern web front-ends&rdquo;, you are invisible — regardless of how qualified you are.
        </p>
        <p>
          The scoring is not mysterious. It is substantially keyword and requirement overlap: does the language in your resume match the language in the posting? That is also why the score is per-job, not a property of your resume — the same resume scores differently against every posting.
        </p>

        <h2 className="text-[22px] font-bold text-foreground tracking-[-0.5px] !mt-10">What counts as a good ATS score?</h2>
        <p>
          As a rule of thumb:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong className="text-foreground">80%+</strong> — strong match. Your resume speaks the posting&rsquo;s language and should surface in recruiter filters.</li>
          <li><strong className="text-foreground">60–79%</strong> — decent, with visible gaps. Worth tailoring before you submit: a few rewritten bullets often close the distance.</li>
          <li><strong className="text-foreground">Below 50%</strong> — either the resume needs real tailoring for this role, or the role genuinely isn&rsquo;t a fit. Both are useful to know before you spend time applying.</li>
        </ul>
        <p>
          Chasing 100% is the wrong goal. A resume stuffed with every keyword reads as spam to the human who eventually opens it — and the human is the one who schedules interviews.
        </p>

        <h2 className="text-[22px] font-bold text-foreground tracking-[-0.5px] !mt-10">How do you improve your ATS score?</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li>Read the posting and note the specific skills, tools, and qualifications it repeats — those are the filter terms.</li>
          <li>Mirror the posting&rsquo;s exact wording where it truthfully describes your experience (&ldquo;React&rdquo; not &ldquo;modern JavaScript frameworks&rdquo;; &ldquo;stakeholder management&rdquo; not &ldquo;worked with teams&rdquo;).</li>
          <li>Rewrite your experience bullets to lead with the matched skills, keeping your real accomplishments and metrics.</li>
          <li>Never add skills you don&rsquo;t have — a keyword that gets you the interview and fails in the room costs more than the filter ever did.</li>
          <li>Re-check the score after tailoring and close remaining gaps where you honestly can.</li>
        </ol>

        <h2 className="text-[22px] font-bold text-foreground tracking-[-0.5px] !mt-10">How Cover Me calculates it</h2>
        <p>
          The <Link href="/" className="text-brand-light hover:text-brand transition-colors">Cover Me</Link> Chrome extension does this whole loop in one click. On any job posting, &ldquo;Tailor Resume to Job&rdquo; rewrites your resume bullets to match the role&rsquo;s keywords — without inventing skills or changing your job history — then scores the result against the posting&rsquo;s requirements and lists each one as matched or a gap. You see exactly where you stand before you apply, and you can re-tailor after addressing the gaps.
        </p>
      </article>

      {/* FAQ */}
      <section className="mt-14">
        <h2 className="text-[22px] font-bold text-foreground tracking-[-0.5px] mb-4">Frequently asked questions</h2>
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
        <h2 className="text-[20px] font-bold text-foreground tracking-[-0.4px] mb-2">See your ATS score on any job posting</h2>
        <p className="text-[14px] text-muted-foreground mb-5 max-w-[420px] mx-auto leading-[1.7]">
          Cover Me tailors your resume to the role and shows your match score and gaps — in one click.
        </p>
        <a
          href={CHROME_STORE_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 bg-brand text-white font-semibold text-[14px] px-5 py-2.5 rounded-[8px] hover:bg-brand/90 transition-colors"
        >
          Install free · Chrome
        </a>
      </div>
    </main>
  )
}
