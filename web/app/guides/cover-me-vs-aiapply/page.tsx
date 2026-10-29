import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { CHROME_STORE_URL } from '@/lib/utils'
import { getGuide, guideArticleJsonLd, guideBreadcrumbJsonLd } from '@/lib/guides'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'
const guide = getGuide('cover-me-vs-aiapply')
const HERO_IMAGE = '/guides/cover-me-vs-aiapply.png'
const HERO_ALT =
  'Infographic comparing Cover Me and AIApply for job applications. Cover Me, labeled "You review. You decide.", makes reviewed, tailored applications. AIApply, labeled "It applies. Automatically.", auto-applies at scale.'

export const metadata: Metadata = {
  title: 'Cover Me vs AIApply: Auto-Apply vs Tailored Applications',
  description: 'AIApply submits applications for you using paid credits. Cover Me writes a tailored resume and cover letter for the posting you have open, and you review and send it yourself. Here is the trade-off.',
  alternates: { canonical: `${BASE}/guides/${guide.slug}` },
  openGraph: {
    title: 'Cover Me vs AIApply | Cover Me',
    description: 'Auto-apply compared with one-click applications you review first.',
    url: `${BASE}/guides/${guide.slug}`,
    siteName: 'Cover Me',
    type: 'article',
    images: [{ url: `${BASE}${HERO_IMAGE}`, width: 1536, height: 1024, alt: 'Cover Me vs AIApply: reviewed, tailored applications compared with auto-apply at scale' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cover Me vs AIApply | Cover Me',
    description: 'Auto-apply compared with one-click applications you review first.',
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
        text: 'No, on purpose. Cover Me writes a tailored cover letter and resume for the job posting you have open. You review, edit, and submit it yourself.',
      },
    },
    {
      '@type': 'Question',
      name: "Is AIApply's auto-apply worth it?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'It depends on what you want more of. If you want the most applications sent for the least time, auto-apply does that. If you want more interviews from each application, a tailored application you have read and checked gives you a better chance, because nothing goes out with a claim you cannot back up.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is AIApply free like Cover Me?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "AIApply has a limited free tier. Full access needs a paid Premium subscription, and auto-apply runs on credits sold in packs, such as 100 or 250. Its pricing page didn't list prices when we checked in October 2026. Cover Me is free with your own API key, free for 10 hosted generations to start and then 5 a week, or $15 a month for up to 25 a day, with every price public.",
      },
    },
  ],
}

const COMPARISON: { feature: string; coverMe: string; aiapply: string }[] = [
  { feature: 'Submits applications for you', coverMe: 'No, you review and submit every one', aiapply: 'Yes, with paid auto-apply credits' },
  { feature: 'Where you find jobs', coverMe: 'Any posting you open on LinkedIn, Indeed, Greenhouse, Lever, Workday or Ashby, or paste', aiapply: 'Its own job search board' },
  { feature: 'Where it runs', coverMe: 'Browser extension, on the page you are viewing', aiapply: 'Separate web dashboard' },
  { feature: 'Resume tailoring', coverMe: 'One click, with an ATS match score and missing keywords shown before you use it', aiapply: 'Resumes tailored to each job description' },
  { feature: 'Invented skills', coverMe: 'A check removes skills your original resume does not support', aiapply: 'Not described on its pricing page' },
  { feature: 'Cover letter', coverMe: 'Written for the posting and editable before you send it', aiapply: 'Cover letter generator' },
  { feature: 'Interview help, job board, translator', coverMe: 'Not included, letters and resumes only', aiapply: 'Live interview coaching, job search board, resume translator' },
  { feature: 'Pricing', coverMe: 'Free with your own key, or 10 then 5 a week · Pro $15/mo for 25 a day, all public', aiapply: 'Premium subscription plus credit packs, prices not listed on its pricing page' },
  { feature: 'Open source', coverMe: 'Yes, MIT licensed', aiapply: 'No' },
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
        <h1 className="text-[clamp(30px,4.5vw,46px)] text-foreground leading-[1.02] mt-4 mb-4">
          Cover Me vs AIApply for job applications
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
          width={1536}
          height={1024}
          priority
          sizes="(max-width: 800px) 100vw, 760px"
          className="w-full h-auto rounded-[12px] border border-border"
        />
      </figure>

      <article className="space-y-5 text-[15.5px] text-muted-foreground leading-[1.85]">
        <p className="text-[17px] text-foreground font-medium leading-[1.7]">
          AIApply is a job search platform built around auto-apply: you buy credits and it submits applications for you with an AI-written resume and cover letter. Cover Me (cover-me.dev) is an open-source Chrome extension that writes a tailored resume and cover letter for the posting you have open, and shows them to you before anything is sent.
        </p>
        <p>
          I build Cover Me, so weigh this comparison with that in mind. The trade-off is real, and for some job searches AIApply&rsquo;s approach fits better.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">What is the difference between Cover Me and AIApply?</h2>
        <p>
          AIApply is built for volume. It finds roles on its job board, tailors your materials, and submits applications for you, paid for with credit packs. You don&rsquo;t have to read each application that goes out under your name. If you treat the job search as a numbers game, that&rsquo;s a reasonable strategy.
        </p>
        <p>
          Cover Me stops one step earlier, on purpose. It writes the letter and the tailored, <Link href="/guides/what-is-an-ats-score" className="text-brand-light hover:text-brand transition-colors">ATS-scored</Link> resume for the posting you&rsquo;re looking at, then hands them back to you to edit, copy, or download. You always submit the application yourself. Auto-apply is left out by design.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">Feature comparison</h2>
        <p className="text-[13px]">AIApply details are from its pricing page, checked October 2026.</p>
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

        <h2 className="text-[22px] text-foreground !mt-10">When does AIApply make sense?</h2>
        <p>
          If you&rsquo;re applying broadly to roles you&rsquo;d be happy with and you&rsquo;d trade polish on each application for reach, auto-apply removes most of the repetitive work. AIApply also bundles a job board, live interview coaching, and a resume translator into one subscription, which helps if you want a single tool for the whole search.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">When do reviewed, tailored applications win?</h2>
        <p>
          When each application counts. An AI-written resume or letter you never read can include a claim you can&rsquo;t back up in an interview, or read as generic to a hiring manager, and you only find out after it&rsquo;s sent. Reviewing each one also lets you fix what the AI got wrong before a recruiter sees it.
        </p>
        <p>
          Cover Me is for people who want AI to do the repetitive part, the copying and pasting, keyword matching, and blank-page start, while every submission stays their decision. Before you see a tailored resume, a check removes any skill or claim your original doesn&rsquo;t support. It works on <Link href="/for/linkedin" className="text-brand-light hover:text-brand transition-colors">LinkedIn</Link>, <Link href="/for/indeed" className="text-brand-light hover:text-brand transition-colors">Indeed</Link>, <Link href="/for/greenhouse" className="text-brand-light hover:text-brand transition-colors">Greenhouse</Link>, <Link href="/for/lever" className="text-brand-light hover:text-brand transition-colors">Lever</Link>, <Link href="/for/workday" className="text-brand-light hover:text-brand transition-colors">Workday</Link>, and <Link href="/for/ashby" className="text-brand-light hover:text-brand transition-colors">Ashby</Link>, and it&rsquo;s free to try with no credit packs to buy first.
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
        <h2 className="text-[20px] text-foreground mb-2">Try applications you review first</h2>
        <p className="text-[14px] text-muted-foreground mb-5 max-w-[420px] mx-auto leading-[1.7]">
          Free with your own API key, or 10 hosted generations to start, then 5 a week. No credit packs and no credit card required.
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
