import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { CHROME_STORE_URL } from '@/lib/utils'
import { getGuide, guideArticleJsonLd, guideBreadcrumbJsonLd } from '@/lib/guides'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'
const guide = getGuide('cover-me-vs-aiapply')
const HERO_IMAGE = '/guides/cover-me-vs-aiapply.png'
const HERO_ALT =
  'Infographic comparing Cover Me and AIApply for job applications: Cover Me — "You review. You decide." — reviewed and tailored applications, versus AIApply — "It applies. Automatically." — auto-apply at scale.'

export const metadata: Metadata = {
  title: 'Cover Me vs AIApply — Auto-Apply vs Tailored Applications',
  description: 'AIApply auto-submits applications for you from a credit-based dashboard. Cover Me generates one tailored letter and resume per posting for you to review. Here’s the honest trade-off.',
  alternates: { canonical: `${BASE}/guides/${guide.slug}` },
  openGraph: {
    title: 'Cover Me vs AIApply — Cover Me',
    description: 'Auto-apply vs one-click, reviewed applications — an honest comparison.',
    url: `${BASE}/guides/${guide.slug}`,
    siteName: 'Cover Me',
    type: 'article',
    images: [{ url: `${BASE}${HERO_IMAGE}`, width: 1536, height: 1024, alt: 'Cover Me vs AIApply — reviewed and tailored applications vs auto-apply at scale' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cover Me vs AIApply — Cover Me',
    description: 'Auto-apply vs one-click, reviewed applications — an honest comparison.',
    images: [`${BASE}${HERO_IMAGE}`],
  },
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Does Cover Me auto-apply to jobs for me?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No, and this is deliberate. Cover Me generates a tailored cover letter and resume for the job posting you have open — you review, edit, and submit it yourself. Auto-submitting applications is explicitly out of scope for the tool.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is AIApply’s auto-apply feature worth it?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'It depends what you’re optimizing for. If your goal is maximum applications sent with minimum time per application, auto-apply delivers that. If your goal is maximum callbacks per application sent, a reviewed, tailored submission generally outperforms an unreviewed one — recruiters and modern ATS software are increasingly good at spotting mass-applied, unedited submissions.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is AIApply free like Cover Me?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'AIApply offers a limited free tier, but full access requires a paid Premium subscription, and auto-apply submissions are metered separately through paid credit packs (e.g. 100 or 250 applications) — exact pricing isn’t published. Cover Me is free with your own API key, free for 5 hosted generations a day, or $8/month for unlimited hosted use — all public, no credit packs.',
      },
    },
  ],
}

const COMPARISON: { feature: string; coverMe: string; aiapply: string }[] = [
  { feature: 'Submits applications for you', coverMe: 'No — you review and submit every one', aiapply: 'Yes, via paid auto-apply credits' },
  { feature: 'Reads the job posting', coverMe: 'Automatic — scrapes the open tab', aiapply: 'Via its own job board or import' },
  { feature: 'Where it runs', coverMe: 'Browser extension, on the page you’re viewing', aiapply: 'Separate web dashboard' },
  { feature: 'Resume tailoring', coverMe: 'One click, ATS match score + gap analysis, shown before you use it', aiapply: 'AI-rewritten per application inside the auto-apply pipeline' },
  { feature: 'Cover letter per application', coverMe: 'Generated and editable before you send it', aiapply: 'Generated as part of the automated submission' },
  { feature: 'Interview prep / job board / translator', coverMe: 'Not in scope — letters and resumes only', aiapply: 'Yes — bundled interview coach, job board, 50+ language resume translator' },
  { feature: 'Pricing', coverMe: 'Free (BYOK or 5/day) · $8/mo unlimited — all public', aiapply: 'Subscription + paid application credit packs — pricing not published' },
  { feature: 'Open source', coverMe: 'Yes — MIT licensed, auditable', aiapply: 'No' },
]

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
          Cover Me vs AIApply for job applications
        </h1>
        <p className="text-[12px] text-muted-foreground">
          <time dateTime={guide.date}>Updated July 21, 2026</time> · Lincoln Laylor
        </p>
      </div>

      {/* Hero graphic */}
      <figure className="mb-12">
        <Image
          src={HERO_IMAGE}
          alt={HERO_ALT}
          width={1536}
          height={1024}
          priority
          sizes="(max-width: 800px) 100vw, 760px"
          className="w-full h-auto rounded-[12px] border border-border"
        />
      </figure>

      <article className="space-y-5 text-[15.5px] text-muted-foreground leading-[1.85]">
        <p className="text-[17px] text-foreground font-medium leading-[1.7]">
          AIApply is a job-search platform built around auto-apply: buy a credit pack, point it at a job board, and it submits applications on your behalf with an AI-generated resume and cover letter attached. Cover Me does one narrower thing — it reads the posting you have open, generates a tailored letter and resume, and shows them to you before anything gets sent. Same underlying technology, opposite bet on where the human belongs in the loop.
        </p>
        <p>
          This is an honest comparison — we build Cover Me, but the trade-off below is real, and for some job searches, AIApply&rsquo;s approach is the right one.
        </p>

        <h2 className="text-[22px] font-bold text-foreground tracking-[-0.5px] !mt-10">The core difference: auto-apply vs reviewed applications</h2>
        <p>
          AIApply&rsquo;s pitch is volume: pay per batch of applications, and it finds roles, tailors materials, and submits — largely without you reading what went out under your name. That&rsquo;s a legitimate strategy if you&rsquo;re optimizing for applications-sent-per-hour and treating the job search as a numbers game.
        </p>
        <p>
          Cover Me stops one step earlier, on purpose. It generates the letter and the tailored, <Link href="/guides/what-is-an-ats-score" className="text-brand-light hover:text-brand transition-colors">ATS-scored</Link> resume for the specific posting you&rsquo;re looking at, then hands it back to you to edit, copy, or download — the submission itself is always a deliberate action you take. Auto-submitting on your behalf is explicitly out of scope; the tool generates, it doesn&rsquo;t apply.
        </p>

        <h2 className="text-[22px] font-bold text-foreground tracking-[-0.5px] !mt-10">Feature comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-[13.5px] border border-border rounded-[8px] overflow-hidden" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className="bg-elevated">
                <th className="text-left px-4 py-3 font-bold text-muted-foreground border-b border-border">Feature</th>
                <th className="text-left px-4 py-3 font-bold text-brand-light border-b border-border">Cover Me</th>
                <th className="text-left px-4 py-3 font-bold text-muted-foreground border-b border-border">AIApply</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, i) => (
                <tr key={row.feature} className={i % 2 === 0 ? 'bg-surface' : 'bg-elevated'}>
                  <td className="px-4 py-3 font-medium text-foreground border-b border-border">{row.feature}</td>
                  <td className="px-4 py-3 text-muted-foreground border-b border-border">{row.coverMe}</td>
                  <td className="px-4 py-3 text-muted-foreground border-b border-border">{row.aiapply}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="text-[22px] font-bold text-foreground tracking-[-0.5px] !mt-10">When AIApply&rsquo;s approach makes sense</h2>
        <p>
          If you&rsquo;re early in your career, applying broadly to roles you&rsquo;re genuinely open to, and comfortable trading per-application polish for sheer coverage, auto-apply removes the tedium entirely. Bundling a job board, interview coaching, and a resume translator into one subscription is also a real convenience if you want a single tool for the whole search rather than assembling your own stack.
        </p>

        <h2 className="text-[22px] font-bold text-foreground tracking-[-0.5px] !mt-10">When reviewed, tailored applications win</h2>
        <p>
          Two things make unreviewed auto-apply riskier than it looks. First, quality control: an AI-written resume or letter you never read can contain a claim you can&rsquo;t back up in an interview, or simply read as generic to a hiring manager — you find out after it&rsquo;s already submitted. Second, detectability: recruiters and modern ATS platforms increasingly flag unusually high application velocity and templated submissions from the same source, which can quietly hurt your standing with a company rather than help it.
        </p>
        <p>
          Cover Me is built for people who want AI to remove the busywork — the copy-pasting, the manual keyword matching, the blank-page problem — while keeping every submission a decision they made. It works the same way across <Link href="/for/linkedin" className="text-brand-light hover:text-brand transition-colors">LinkedIn</Link>, <Link href="/for/indeed" className="text-brand-light hover:text-brand transition-colors">Indeed</Link>, <Link href="/for/greenhouse" className="text-brand-light hover:text-brand transition-colors">Greenhouse</Link>, <Link href="/for/lever" className="text-brand-light hover:text-brand transition-colors">Lever</Link>, <Link href="/for/workday" className="text-brand-light hover:text-brand transition-colors">Workday</Link>, and <Link href="/for/ashby" className="text-brand-light hover:text-brand transition-colors">Ashby</Link>, and it&rsquo;s free to try — no credit packs to buy before you know if it helps.
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
        <h2 className="text-[20px] font-bold text-foreground tracking-[-0.4px] mb-2">Try the reviewed-application version</h2>
        <p className="text-[14px] text-muted-foreground mb-5 max-w-[420px] mx-auto leading-[1.7]">
          Free with your own API key or 5 hosted generations a day. No credit packs, no credit card required.
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
