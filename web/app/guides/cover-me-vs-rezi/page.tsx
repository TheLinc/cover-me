import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { CHROME_STORE_URL } from '@/lib/utils'
import { getGuide, guideArticleJsonLd, guideBreadcrumbJsonLd } from '@/lib/guides'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'
const guide = getGuide('cover-me-vs-rezi')
const HERO_IMAGE = '/guides/cover-me-vs-rezi.png'
const HERO_ALT =
  "Table comparing Rezi and Cover Me, with prices from each company's site in November 2026. Built for: building a resume in Rezi's templates, against tailoring the resume you already have to each posting. Free plan: 1 resume and 3 PDF downloads, against unlimited with your own API key, or 10 to start then 5 a week. Paid plan: $29 a month or $149 once, against $15 a month or $35 every 3 months. Open source: no against yes, MIT."

export const metadata: Metadata = {
  title: { absolute: 'Cover Me vs Rezi: Tailor the Resume You Already Have' },
  description: 'Rezi builds resumes in its templates, with Pro at $29 a month. Cover Me tailors the resume you have to each posting, free with your own API key or $15 a month.',
  alternates: { canonical: `${BASE}/guides/${guide.slug}` },
  openGraph: {
    title: 'Cover Me vs Rezi | Cover Me',
    description: 'A Rezi alternative that tailors the resume you already have and writes your cover letter on the posting.',
    url: `${BASE}/guides/${guide.slug}`,
    siteName: 'Cover Me',
    type: 'article',
    images: [{ url: `${BASE}${HERO_IMAGE}`, width: 1600, height: 900, alt: 'Rezi and Cover Me compared on what each is built for, free plans, paid plans and open source' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cover Me vs Rezi | Cover Me',
    description: 'A Rezi alternative that tailors the resume you already have and writes your cover letter on the posting.',
    images: [`${BASE}${HERO_IMAGE}`],
  },
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Is there a cheaper alternative to Rezi Pro?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Cover Me Pro is $15 a month or $35 every 3 months, against Rezi Pro at $29 a month or Rezi Lifetime at $149 once. Cover Me is also free and unlimited with your own OpenAI or Claude API key, where you pay the AI provider for what you use, or free for 10 generations to start, then 5 a week. Rezi's free plan gives 1 resume and 3 PDF downloads.",
      },
    },
    {
      '@type': 'Question',
      name: 'Does Cover Me keep my resume design, or put it in a template like Rezi?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Upload your resume as a Word file and Cover Me tailors the text inside that file, so the Word download keeps your fonts and layout (beta). A PDF upload, or a Word file it can't edit in place, gets Cover Me's standard one-column layout. Rezi's site says an imported resume's content goes into a new Rezi document, which you then format with Rezi's templates.",
      },
    },
    {
      '@type': 'Question',
      name: 'Does Cover Me have an ATS score like the Rezi Score?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Yes, but it measures something different. Cover Me's ATS score is a 0 to 100 keyword match against one job posting, with every missing keyword listed. Rezi says the Rezi Score checks your resume's strength on 23 metrics, and its full version and full keyword targeting are on paid plans.",
      },
    },
  ],
}

const COMPARISON: { feature: string; coverMe: string; rezi: string }[] = [
  { feature: 'Built for', coverMe: 'Tailoring your existing resume and writing a letter for each posting', rezi: 'Writing and formatting a resume in its builder and templates' },
  { feature: 'Free plan', coverMe: 'Unlimited with your own API key, or 10 generations to start, then 5 a week', rezi: '1 resume, 3 PDF downloads, 1 AI interview, standard templates, limited keyword targeting and Rezi Score' },
  { feature: 'Paid plan', coverMe: '$15 a month, or $35 every 3 months, for up to 25 generations a day', rezi: 'Pro at $29 a month, or Lifetime at $149 once' },
  { feature: 'Where it runs', coverMe: 'Chrome extension, on the job posting you have open', rezi: 'Web app, plus a Chrome extension that fills in application forms' },
  { feature: 'Tailoring', coverMe: 'One click rewrites your bullets, summary and skills in the posting’s words', rezi: 'Keyword targeting against a job description, full on Pro' },
  { feature: 'Score', coverMe: 'ATS score from 0 to 100 with every missing keyword listed', rezi: 'Rezi Score on 23 metrics, full on Pro' },
  { feature: 'Your own design', coverMe: 'A Word upload keeps its fonts and layout in the Word download (beta)', rezi: 'Imports your resume into a Rezi document and its templates' },
  { feature: 'Cover letters', coverMe: 'On every plan, written for the posting', rezi: 'On every plan, from your resume and the job' },
  { feature: 'Open source', coverMe: 'Yes, MIT licensed', rezi: 'No' },
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
          Cover Me vs Rezi: tailor the resume you already have
        </h1>
        <p className="text-[12px] text-muted-foreground">
          <time dateTime={guide.updated ?? guide.date}>Updated November 7, 2026</time> · Lincoln Laylor
        </p>
      </div>

      {/* Hero graphic */}
      <div className="mb-10 h-px bg-line" />
      <figure className="mb-12">
        <Image
          src={HERO_IMAGE}
          alt={HERO_ALT}
          width={1600}
          height={900}
          priority
          sizes="(max-width: 800px) 100vw, 760px"
          className="w-full h-auto rounded-[12px] border border-border"
        />
      </figure>

      <article className="space-y-5 text-[15.5px] text-muted-foreground leading-[1.85]">
        <p className="text-[17px] text-foreground font-medium leading-[1.7]">
          Rezi is an AI resume builder: you write or import your resume, format it in Rezi&rsquo;s templates and target it at a job, with Pro at $29 a month or $149 once. Cover Me (cover-me.dev) is an open-source Chrome extension that tailors the resume you already have to the posting you have open, scores it and writes a cover letter. It&rsquo;s free with your own API key, or $15 a month.
        </p>
        <p>
          I build Cover Me, so weigh this comparison with that in mind. Rezi prices and features are from its{' '}
          <a href="https://www.rezi.ai/pricing" target="_blank" rel="noopener noreferrer" className="text-brand-light hover:text-brand transition-colors">pricing page</a>,{' '}
          <a href="https://www.rezi.ai/ai-resume-builder" target="_blank" rel="noopener noreferrer" className="text-brand-light hover:text-brand transition-colors">resume builder page</a> and{' '}
          <a href="https://www.rezi.ai/rezi-chrome-extension" target="_blank" rel="noopener noreferrer" className="text-brand-light hover:text-brand transition-colors">Chrome extension page</a>, checked on November 7, 2026.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">What is the difference between Cover Me and Rezi?</h2>
        <p>
          Rezi is where you make the resume. Its AI writes and edits bullet points, its templates set the layout, and its keyword targeting and Rezi Score check the result against a job description. You can import an existing PDF or Word resume, and Rezi&rsquo;s builder page says the import fills a new Rezi document with your experience. It also has a cover letter writer, AI interview practice, a job tracker and a Chrome extension that fills in application forms.
        </p>
        <p>
          Cover Me starts from the resume you have. Upload it once, open a posting on <Link href="/for/linkedin" className="text-brand-light hover:text-brand transition-colors">LinkedIn</Link>, <Link href="/for/indeed" className="text-brand-light hover:text-brand transition-colors">Indeed</Link>, <Link href="/for/greenhouse" className="text-brand-light hover:text-brand transition-colors">Greenhouse</Link>, <Link href="/for/lever" className="text-brand-light hover:text-brand transition-colors">Lever</Link>, <Link href="/for/workday" className="text-brand-light hover:text-brand transition-colors">Workday</Link> or <Link href="/for/ashby" className="text-brand-light hover:text-brand transition-colors">Ashby</Link>, or paste one from anywhere else, and click Tailor Resume to Job. It rewrites your bullets, summary and skills in the posting&rsquo;s words, shows an <Link href="/guides/what-is-an-ats-score" className="text-brand-light hover:text-brand transition-colors">ATS score</Link> with every missing keyword, and writes a matching cover letter when you click Generate Cover Letter.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">Feature comparison</h2>
        <p className="text-[13px]">Rezi details are from its own site, checked November 7, 2026.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[13.5px] border border-border rounded-[8px] overflow-hidden" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className="bg-elevated">
                <th className="text-left px-4 py-3 font-bold text-muted-foreground border-b border-border">Feature</th>
                <th className="text-left px-4 py-3 font-bold text-brand-light border-b border-border">Cover Me</th>
                <th className="text-left px-4 py-3 font-bold text-muted-foreground border-b border-border">Rezi</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, i) => (
                <tr key={row.feature} className={i % 2 === 0 ? 'bg-surface' : 'bg-elevated'}>
                  <td className="px-4 py-3 font-medium text-foreground border-b border-border">{row.feature}</td>
                  <td className="px-4 py-3 text-muted-foreground border-b border-border">{row.coverMe}</td>
                  <td className="px-4 py-3 text-muted-foreground border-b border-border">{row.rezi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="text-[22px] text-foreground !mt-10">How much do Rezi Pro and Cover Me Pro cost?</h2>
        <p>
          Rezi Pro costs $29 a month, and Rezi Lifetime is a one-time $149 for the Pro features without the monthly expert review. Rezi&rsquo;s free plan includes 1 resume, 3 PDF downloads and 1 AI interview, with limited keyword targeting and Rezi Score. Cover Me Pro costs $15 a month or $35 every 3 months, for up to 25 generations a day, with every letter and tailored resume saved to your account. With your own OpenAI or Claude API key, Cover Me is free and unlimited, and you pay the AI provider for what you use. Without a key, the hosted free plan gives 10 generations to start, then 5 a week.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">Does Cover Me keep my resume&rsquo;s design?</h2>
        <p>
          It does if you upload a Word file. Cover Me then rewrites the text inside your own .docx, and the Word download keeps its fonts, spacing and layout. This is in beta, and the popup tells you before you tailor how many bullets it can edit in place. A PDF upload, or a Word file it can&rsquo;t edit in place, gets Cover Me&rsquo;s standard one-column layout, and the PDF download always uses that layout. The{' '}
          <Link href="/guides/ats-friendly-resume-format" className="text-brand-light hover:text-brand transition-colors">ATS format guide</Link> shows which Word layouts application systems read cleanly.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">When is Rezi the better choice?</h2>
        <p>
          When you need to build a resume, not adapt one. If you&rsquo;re starting from nothing or your current layout needs replacing, Rezi&rsquo;s writer and templates do that work, and Lifetime is a one-time price if you&rsquo;d rather not subscribe. It also bundles things Cover Me doesn&rsquo;t do: AI interview practice, paid expert reviews and a Chrome extension that fills in application forms.
        </p>

        <h2 className="text-[22px] text-foreground !mt-10">When is Cover Me the better choice?</h2>
        <p>
          When your resume already looks the way you want and the work is adapting it to every posting. Cover Me does that from the posting page in one click and keeps a Word resume in its own design. Before you see a tailored resume, a check removes any skill or claim your original resume doesn&rsquo;t support, so nothing goes out that you can&rsquo;t back up in an interview. The code is MIT licensed on{' '}
          <a href="https://github.com/TheLinc/cover-me" target="_blank" rel="noopener noreferrer" className="text-brand-light hover:text-brand transition-colors">GitHub</a>, and the two can work together: Rezi to build the resume once, Cover Me to tailor it for each application.
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
        <h2 className="text-[20px] text-foreground mb-2">Tailor your resume on the posting</h2>
        <p className="text-[14px] text-muted-foreground mb-5 max-w-[420px] mx-auto leading-[1.7]">
          Free with your own API key, or 10 hosted generations to start, then 5 a week. No credit card required.
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
