import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { CHROME_STORE_URL } from '@/lib/utils'
import { getGuide, guideArticleJsonLd, guideBreadcrumbJsonLd } from '@/lib/guides'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'
const guide = getGuide('tailor-resume-to-job-description')
const HERO_IMAGE = '/guides/tailor-resume-to-job-description.png'
const HERO_ALT =
  'Infographic: how to tailor your resume to a job description in five steps — extract keywords, mirror language, rewrite key bullets, reorder skills, verify the match. A job description flows into a tailored resume with a 95% ATS match score and key requirements checked off. Tailoring is translation, not fiction: use the posting’s language to reflect your real experience, never invent skills you don’t have.'

export const metadata: Metadata = {
  title: 'How to Tailor Your Resume to a Job Description (Step by Step)',
  description: 'A practical method for matching your resume to a specific role: find the filter keywords, mirror the posting’s language truthfully, rewrite the right bullets, and verify the match.',
  alternates: { canonical: `${BASE}/guides/${guide.slug}` },
  openGraph: {
    title: 'How to Tailor Your Resume to a Job Description — Cover Me',
    description: 'A step-by-step method for matching your resume to a specific role — which keywords matter, what to rewrite, and what never to fabricate.',
    url: `${BASE}/guides/${guide.slug}`,
    siteName: 'Cover Me',
    type: 'article',
    images: [{ url: `${BASE}/guides/tailor-resume-to-job-description.png`, width: 1672, height: 941, alt: 'How to tailor your resume to a job description — five steps to a verified ATS match' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How to Tailor Your Resume to a Job Description — Cover Me',
    description: 'A step-by-step method for matching your resume to a specific role — which keywords matter, what to rewrite, and what never to fabricate.',
    images: [`${BASE}/guides/tailor-resume-to-job-description.png`],
  },
}

const STEPS = [
  {
    name: 'Extract the keywords that matter',
    text: 'Read the posting twice. Highlight the hard skills, tools, and qualifications that appear in the requirements — especially anything mentioned more than once or listed as “required”. Those repeated terms are what recruiters filter by in the ATS.',
  },
  {
    name: 'Mirror the posting’s exact language',
    text: 'ATS keyword matching is often literal. If the posting says “React”, write “React”, not “modern JavaScript frameworks”. If it says “stakeholder management”, use those words — provided they truthfully describe your experience.',
  },
  {
    name: 'Rewrite your most relevant bullets first',
    text: 'Don’t rewrite everything. Take the 4–6 experience bullets most relevant to this role and lead them with the matched skills, keeping your real metrics and outcomes. Recruiters skim top-down; your strongest matches should appear early.',
  },
  {
    name: 'Reorder your skills section for the role',
    text: 'Move the skills this posting asks for to the front of your skills list, and cut skills that add noise for this particular application. A skills section is per-application real estate, not a permanent inventory.',
  },
  {
    name: 'Verify the match before submitting',
    text: 'Score your tailored resume against the posting — manually by checklist, or automatically with a tool that shows an ATS match score and lists gaps. Fix what you truthfully can, and accept the gaps you can’t.',
  },
]

const howToJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to tailor your resume to a job description',
  description: 'A five-step method for matching your resume to a specific role: extract keywords, mirror the posting’s language, rewrite the right bullets, reorder skills, and verify the match.',
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
        text: 'For roles you actually want — yes. Tailoring is the single highest-leverage edit you can make, because ATS filtering happens per-posting. Done manually it takes 20–30 minutes per role; automated tools like Cover Me reduce it to one click, which makes tailoring every application practical.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is it okay to add keywords I don’t have experience with?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. Fabricated keywords survive the ATS but fail in the interview, and a discovered fabrication ends your candidacy entirely. Tailoring means re-expressing your real experience in the posting’s language — never inventing experience you don’t have.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can AI tailor my resume automatically?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. The Cover Me Chrome extension reads the job posting you have open, rewrites your resume bullets to match the role’s ATS keywords without inventing skills or changing your job history, shows a match score with the remaining gaps, and exports a formatted PDF.',
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
        <h1 className="text-[clamp(30px,4.5vw,46px)] font-extrabold tracking-[-1.8px] text-foreground leading-[1.02] mt-4 mb-4">
          How to tailor your resume to a job description
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
        <p className="text-[17px] text-foreground font-medium leading-[1.7]">
          Tailoring a resume means rewriting it for one specific job posting: mirroring the posting&rsquo;s keywords where they truthfully describe your experience, leading with the most relevant accomplishments, and cutting what doesn&rsquo;t serve this role. It matters because applicant tracking systems filter resumes by keyword match — a strong candidate with an untailored resume is routinely invisible.
        </p>
        <p>
          Here is the five-step method, followed by the honest caveats — including what you should never do.
        </p>

        <h2 className="text-[22px] font-bold text-foreground tracking-[-0.5px] !mt-10">The five-step method</h2>
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

        <h2 className="text-[22px] font-bold text-foreground tracking-[-0.5px] !mt-10">The line you must not cross</h2>
        <p>
          Tailoring is translation, not fiction. Re-expressing &ldquo;built dashboards used by leadership&rdquo; as &ldquo;stakeholder reporting and data visualization&rdquo; is honest tailoring — the experience is the same, the language now matches the filter. Adding &ldquo;Kubernetes&rdquo; because the posting wants it and you once watched a talk is fabrication. It passes the ATS, then costs you the interview, and sometimes the offer you already had.
        </p>
        <p>
          The practical test: could you speak about this bullet, as written, for two minutes in an interview? If not, it doesn&rsquo;t belong on the tailored resume.
        </p>

        <h2 className="text-[22px] font-bold text-foreground tracking-[-0.5px] !mt-10">Doing it in one click</h2>
        <p>
          The method above takes 20–30 minutes per application done well — which is why most people stop tailoring after the third application of the day. The <Link href="/" className="text-brand-light hover:text-brand transition-colors">Cover Me</Link> Chrome extension automates exactly this method: on any job posting, &ldquo;Tailor Resume to Job&rdquo; extracts the role&rsquo;s keywords, rewrites your bullets in the posting&rsquo;s language under a hard constraint against inventing skills or changing your job history, then shows your <Link href="/guides/what-is-an-ats-score" className="text-brand-light hover:text-brand transition-colors">ATS match score</Link> with each requirement marked matched or gap. It works on <Link href="/for/linkedin" className="text-brand-light hover:text-brand transition-colors">LinkedIn</Link>, <Link href="/for/indeed" className="text-brand-light hover:text-brand transition-colors">Indeed</Link>, <Link href="/for/greenhouse" className="text-brand-light hover:text-brand transition-colors">Greenhouse</Link>, <Link href="/for/lever" className="text-brand-light hover:text-brand transition-colors">Lever</Link>, <Link href="/for/workday" className="text-brand-light hover:text-brand transition-colors">Workday</Link>, and <Link href="/for/ashby" className="text-brand-light hover:text-brand transition-colors">Ashby</Link>, and exports a formatted one-page PDF when the role demands it.
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
        <h2 className="text-[20px] font-bold text-foreground tracking-[-0.4px] mb-2">Tailor your resume in one click</h2>
        <p className="text-[14px] text-muted-foreground mb-5 max-w-[420px] mx-auto leading-[1.7]">
          Keywords matched, score shown, gaps listed — without inventing a single skill.
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
