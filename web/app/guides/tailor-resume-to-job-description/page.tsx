import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { CHROME_STORE_URL } from '@/lib/utils'
import { getGuide, guideArticleJsonLd, guideBreadcrumbJsonLd } from '@/lib/guides'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'
const guide = getGuide('tailor-resume-to-job-description')
const HERO_IMAGE = '/guides/tailor-resume-to-job-description.png'
const HERO_ALT =
  "Infographic: how to tailor your resume to a job description in five steps. Extract keywords, mirror the posting's language, rewrite key bullets, reorder skills, and verify the match. A job description flows into a tailored resume with a 95% ATS match score and its key requirements checked off. Use the posting's language to describe your real experience, and never add skills you don't have."

export const metadata: Metadata = {
  title: 'How to Tailor Your Resume to a Job Description (Step by Step)',
  description: "A five-step method for matching your resume to one job posting: find the must-have keywords, use the posting's wording where it's true, rewrite the right bullets, reorder your skills, and check the match.",
  alternates: { canonical: `${BASE}/guides/${guide.slug}` },
  openGraph: {
    title: 'How to Tailor Your Resume to a Job Description | Cover Me',
    description: 'A step-by-step method for matching your resume to one role: which keywords matter, what to rewrite, and what never to add.',
    url: `${BASE}/guides/${guide.slug}`,
    siteName: 'Cover Me',
    type: 'article',
    images: [{ url: `${BASE}/guides/tailor-resume-to-job-description.png`, width: 1672, height: 941, alt: 'How to tailor your resume to a job description in five steps, ending with a checked ATS match' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How to Tailor Your Resume to a Job Description | Cover Me',
    description: 'A step-by-step method for matching your resume to one role: which keywords matter, what to rewrite, and what never to add.',
    images: [`${BASE}/guides/tailor-resume-to-job-description.png`],
  },
}

const STEPS = [
  {
    name: 'Find the 4 to 6 must-have keywords',
    text: 'Read the posting twice. Mark the hard skills, tools, and qualifications listed as required, repeated, or placed first. Recruiters filter the ATS by these terms, so they matter more than the long list of nice-to-haves.',
  },
  {
    name: "Use the posting's exact wording",
    text: 'ATS searches are often literal. If the posting says "React", write "React", not "modern JavaScript frameworks". If it says "stakeholder management", use those words, as long as they truthfully describe your experience.',
  },
  {
    name: 'Rewrite your most relevant bullets first',
    text: "You don't need to rewrite everything. Take the 4 to 6 bullets most relevant to this role and lead each one with a matched skill, keeping your real numbers and results. Recruiters skim from the top, so put your strongest matches early.",
  },
  {
    name: 'Reorder your skills section for the role',
    text: 'Move the skills this posting asks for to the front of your skills list, and cut skills that add noise for this application. Each must-have you really have should appear in your summary, your skills, and at least one bullet.',
  },
  {
    name: 'Check the match before you submit',
    text: "Score your tailored resume against the posting, either by checklist or with a tool that shows an ATS match score and lists the gaps. Fix what you truthfully can, and accept the gaps you can't.",
  },
]

const howToJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to tailor your resume to a job description',
  description: "A five-step method for matching your resume to one role: find the must-have keywords, use the posting's wording, rewrite the right bullets, reorder your skills, and check the match.",
  totalTime: 'PT20M',
  step: STEPS.map((s, i) => ({
    '@type': 'HowToStep',
    name: s.name,
    text: s.text,
    position: i + 1,
  })),
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Should I tailor my resume for every job application?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "For every role you want, yes. Recruiters search each posting's applicants separately, and Huntr's analysis of over 1.39 million applications found tailored resumes reached the interview stage 2.1 times as often as untailored ones. A tool like Cover Me makes it one click, which makes tailoring every application practical.",
      },
    },
    {
      '@type': 'Question',
      name: "Is it okay to add keywords I don't have experience with?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: "No. An invented keyword can get you past the ATS and then fail in the interview, and a discovered fabrication ends your candidacy. Tailoring means describing your real experience in the posting's language.",
      },
    },
    {
      '@type': 'Question',
      name: 'Can AI tailor my resume automatically?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Yes. The Cover Me Chrome extension reads the job posting you have open and rewrites your resume around the role's keywords without changing your job titles, employers, or dates. A check removes any skill or claim your original resume doesn't support. It shows a match score with the remaining gaps and exports a PDF.",
      },
    },
    {
      '@type': 'Question',
      name: 'How long does it take to tailor a resume?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Doing it well by hand takes long enough that most people stop after a few applications a day. Using ChatGPT, it took the developer of Cover Me about 12 minutes per application. Cover Me does the tailoring in one click, and a typical run takes about 30 seconds.',
      },
    },
  ],
}

export default function Page() {
  return (
    <main className="max-w-[760px] mx-auto px-8 py-20 max-md:px-5">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(guideArticleJsonLd(guide, HERO_IMAGE)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(guideBreadcrumbJsonLd(guide)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <div className="mb-12">
        <Link href="/guides" className="text-[12px] font-semibold text-brand-light hover:text-brand transition-colors">
          ← All guides
        </Link>
        <h1 className="text-[clamp(30px,4.5vw,46px)] text-foreground leading-[1.02] mt-4 mb-4">
          How to tailor your resume to a job description
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
        <p className="text-[17px] text-foreground font-medium leading-[1.7]">
          To tailor your resume to a job description, find the posting&rsquo;s 4 to 6 must-have keywords, use its exact wording wherever it truthfully describes your experience, rewrite your most relevant bullets to lead with those skills, and cut what doesn&rsquo;t serve the role. Never add a skill you don&rsquo;t have.
        </p>
        <p>
          It matters because recruiters search their applicant tracking system for the posting&rsquo;s terms, so a strong candidate with an untailored resume often doesn&rsquo;t come up. Huntr analyzed over 1.39 million applications and found tailored resumes reached the interview stage{' '}
          <a href="https://huntr.co/research/job-search-trends-q2-2025" target="_blank" rel="noopener noreferrer" className="text-brand-light hover:text-brand transition-colors">2.1 times as often</a>
          , 5.75% against 2.68%.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">What are the steps to tailor a resume?</h2>
        <ol className="list-none space-y-6 !mt-6">
          {STEPS.map((s, i) => (
            <li key={s.name} className="flex gap-5">
              <span className="text-[11px] font-bold text-brand tracking-[0.08em] pt-[5px] shrink-0 w-7">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <h3 className="text-[16px] font-bold text-foreground tracking-[-0.3px] mb-1.5">{s.name}</h3>
                <p className="text-[14.5px] leading-[1.8]">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <h2 className="text-[22px] text-foreground !mt-10">What should you never add when tailoring?</h2>
        <p>
          Anything you can&rsquo;t back up. Rewriting &ldquo;built dashboards used by leadership&rdquo; as &ldquo;stakeholder reporting and data visualization&rdquo; is honest tailoring, because the experience is the same and only the wording changed. Adding &ldquo;Kubernetes&rdquo; because the posting wants it and you once watched a talk is fabrication. It passes the ATS, then costs you the interview, and sometimes an offer you already had.
        </p>
        <p>
          A practical test: could you talk about this bullet, as written, for two minutes in an interview? If not, leave it off the tailored resume.
        </p>
        <p>
          AI tools get this wrong often. When a posting asks for a certification or tool, chatbots tend to add it to your resume, so read every line they write before you send it.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">Can you tailor a resume in one click?</h2>
        <p>
          Yes. Done well by hand, this method takes long enough that most people stop tailoring after a few applications a day. Using ChatGPT, it took me about 12 minutes per application, which is why I built <Link href="/" className="text-brand-light hover:text-brand transition-colors">Cover Me (cover-me.dev)</Link>, an open-source Chrome extension that follows the same method.
        </p>
        <p>
          On a job posting, &ldquo;Tailor Resume to Job&rdquo; finds the role&rsquo;s keywords and rewrites your bullets, summary, and skills in the posting&rsquo;s language. Your job titles, employers, and dates stay as they are. Every skill the AI adds has to cite evidence from your resume, and a check removes any skill or claim your original doesn&rsquo;t support. You then see your <Link href="/guides/what-is-an-ats-score" className="text-brand-light hover:text-brand transition-colors">ATS match score</Link> with each missing keyword listed, and you can export the result as a PDF.
        </p>
        <p>
          It works on <Link href="/for/linkedin" className="text-brand-light hover:text-brand transition-colors">LinkedIn</Link>, <Link href="/for/indeed" className="text-brand-light hover:text-brand transition-colors">Indeed</Link>, <Link href="/for/greenhouse" className="text-brand-light hover:text-brand transition-colors">Greenhouse</Link>, <Link href="/for/lever" className="text-brand-light hover:text-brand transition-colors">Lever</Link>, <Link href="/for/workday" className="text-brand-light hover:text-brand transition-colors">Workday</Link>, and <Link href="/for/ashby" className="text-brand-light hover:text-brand transition-colors">Ashby</Link>, and you can paste a posting from any other site. It&rsquo;s free and unlimited with your own Claude or OpenAI API key.
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
        <h2 className="text-[20px] text-foreground mb-2">Tailor your resume in one click</h2>
        <p className="text-[14px] text-muted-foreground mb-5 max-w-[420px] mx-auto leading-[1.7]">
          Keywords matched, score shown, gaps listed, and no invented skills.
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
