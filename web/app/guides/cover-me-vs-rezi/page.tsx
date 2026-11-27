import type { Metadata } from 'next'
import Link from 'next/link'
import { ComparisonTable, GuideArticle } from '@/components/site/GuideArticle'
import { getGuide } from '@/lib/guides'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'
const guide = getGuide('cover-me-vs-rezi')

export const metadata: Metadata = {
  title: { absolute: 'Rezi vs Cover Me: Pricing and Which One to Use' },
  description: 'Rezi builds resumes in its templates, with Pro at $29 a month. Cover Me tailors the resume you have to each posting, with a free plan or Pro at $15 a month.',
  alternates: { canonical: `${BASE}/guides/${guide.slug}` },
  openGraph: {
    title: 'Cover Me vs Rezi | Cover Me',
    description: 'A Rezi alternative that tailors the resume you already have and writes your cover letter on the posting.',
    url: `${BASE}/guides/${guide.slug}`,
    siteName: 'Cover Me',
    type: 'article',
    images: [{ url: `${BASE}${guide.image}`, width: 1600, height: 900, alt: 'Rezi and Cover Me compared on what each is built for, free plans, paid plans and open source' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cover Me vs Rezi | Cover Me',
    description: 'A Rezi alternative that tailors the resume you already have and writes your cover letter on the posting.',
    images: [`${BASE}${guide.image}`],
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

const COMPARISON: { feature: string; coverMe: string; them: string }[] = [
  { feature: 'Built for', coverMe: 'Tailoring your existing resume and writing a letter for each posting', them: 'Writing and formatting a resume in its builder and templates' },
  { feature: 'Free plan', coverMe: 'Unlimited with your own API key, or 10 generations to start, then 5 a week', them: '1 resume, 3 PDF downloads, 1 AI interview, standard templates, limited keyword targeting and Rezi Score' },
  { feature: 'Paid plan', coverMe: '$15 a month, or $35 every 3 months, for up to 25 generations a day', them: 'Pro at $29 a month, or Lifetime at $149 once' },
  { feature: 'Where it runs', coverMe: 'Chrome extension, on the job posting you have open', them: 'Web app, plus a Chrome extension that fills in application forms' },
  { feature: 'Tailoring', coverMe: 'One click rewrites your bullets, summary and skills in the posting’s words', them: 'Keyword targeting against a job description, full on paid plans' },
  { feature: 'Score', coverMe: 'ATS score from 0 to 100 with every missing keyword listed', them: 'Rezi Score of resume strength on 23 metrics, full on paid plans' },
  { feature: 'Your own design', coverMe: 'A Word upload keeps its fonts and layout in the Word download (beta)', them: 'Imports your resume into a Rezi document and its templates' },
  { feature: 'AI cover letters', coverMe: 'On every plan, written for the posting', them: 'AI cover letter writer on paid plans' },
  { feature: 'Downloads', coverMe: 'PDF, plus Word for the tailored resume, on every plan', them: '3 PDFs on the free plan; unlimited PDFs and Word files on paid plans' },
  { feature: 'Open source', coverMe: 'Yes, MIT licensed', them: 'No' },
]

export default function Page() {
  return (
    <GuideArticle
      guide={guide}
      lede={
        <>
          Rezi is an AI resume builder: you write or import your resume, format it in Rezi&rsquo;s templates and target it at a job, with Pro at $29 a month or Lifetime at $149 once. Cover Me (cover-me.dev) is a Chrome extension that tailors the resume you already have to the posting you have open, scores it and writes a cover letter. It has a free plan, and Pro is $15 a month.
        </>
      }
      tldr={[
        "Rezi is an AI resume builder: you format your resume in its templates. Pro is $29 a month, or Lifetime is $149 once.",
        "Cover Me tailors the resume you already have to the posting you have open, scores it and writes the cover letter.",
        "Cover Me has a free plan, and Pro is $15 a month. A Word upload keeps its own design (beta).",
      ]}
      intro={
        <p>
          I build Cover Me, so weigh this comparison with that in mind. Rezi prices and features are from its{' '}
          <a href="https://www.rezi.ai/pricing" target="_blank" rel="noopener noreferrer">pricing page</a>,{' '}
          <a href="https://www.rezi.ai/ai-resume-builder" target="_blank" rel="noopener noreferrer">resume builder page</a> and{' '}
          <a href="https://www.rezi.ai/rezi-chrome-extension" target="_blank" rel="noopener noreferrer">Chrome extension page</a>, checked on November 7, 2026.
        </p>
      }
      sections={[
        {
          title: 'What is the difference between Cover Me and Rezi?',
          body: (
            <>
              <p>
                Rezi is where you make the resume. Its AI writes and edits bullet points, its templates set the layout, keyword targeting checks the result against a job description, and the Rezi Score rates the resume on 23 metrics. You can upload your existing resume, and Rezi&rsquo;s builder page says the import fills a new Rezi document with your experience. Paid plans add an AI cover letter writer. It also has AI interview practice, a job tracker and a Chrome extension that fills in application forms.
              </p>
              <p>
                Cover Me starts from the resume you have. Upload it once, open a posting on <Link href="/for/linkedin">LinkedIn</Link>, <Link href="/for/indeed">Indeed</Link>, <Link href="/for/greenhouse">Greenhouse</Link>, <Link href="/for/lever">Lever</Link>, <Link href="/for/workday">Workday</Link>, <Link href="/for/ashby">Ashby</Link>, BambooHR or Workable, or paste one from anywhere else, and click Tailor Resume to Job. It rewrites your bullets, summary and skills in the posting&rsquo;s words, shows an <Link href="/guides/what-is-an-ats-score">ATS score</Link> with every missing keyword, and writes a matching cover letter when you click Generate Cover Letter.
              </p>
            </>
          ),
        },
        {
          title: 'Feature comparison',
          body: (
            <>
              <ComparisonTable name="Rezi" rows={COMPARISON} caption="Rezi details are from its own site, checked November 7, 2026." />
            </>
          ),
        },
        {
          title: 'How much do Rezi Pro and Cover Me Pro cost?',
          body: (
            <p>
              Rezi Pro costs $29 a month, and Rezi Lifetime is a one-time $149 for the Pro features without the monthly expert review. Rezi&rsquo;s free plan includes 1 resume, 3 PDF downloads and 1 AI interview, with limited keyword targeting and Rezi Score, and its plan table puts the AI cover letter writer and Word downloads on paid plans. Cover Me Pro costs $15 a month or $35 every 3 months, for up to 25 generations a day, with every letter and tailored resume saved to your account. With your own OpenAI or Claude API key, Cover Me is free and unlimited, and you pay the AI provider for what you use. Without a key, the hosted free plan gives 10 generations to start, then 5 a week.
            </p>
          ),
        },
        {
          title: 'Does Cover Me keep my resume’s design?',
          body: (
            <p>
              It does if you upload a Word file. Cover Me then rewrites the text inside your own .docx, and the Word download keeps its fonts, spacing and layout. This is in beta, and the popup tells you before you tailor how many bullets it can edit in place. A PDF upload, or a Word file it can&rsquo;t edit in place, gets Cover Me&rsquo;s standard one-column layout, and the PDF download always uses that layout. You can also download that layout as a <Link href="/guides/ats-resume-template">free ATS resume template</Link>. The{' '}
              <Link href="/guides/ats-friendly-resume-format">ATS format guide</Link> shows which Word layouts application systems read cleanly.
            </p>
          ),
        },
        {
          title: 'When is Rezi the better choice?',
          body: (
            <p>
              When you need to build a resume, not adapt one. If you&rsquo;re starting from nothing or your current layout needs replacing, Rezi&rsquo;s writer and templates do that work, and Lifetime is a one-time price if you&rsquo;d rather not subscribe. It also bundles things Cover Me doesn&rsquo;t do: AI interview practice, paid expert reviews and a Chrome extension that fills in application forms.
            </p>
          ),
        },
        {
          title: 'When is Cover Me the better choice?',
          body: (
            <p>
              When your resume already looks the way you want and the work is adapting it to every posting. Cover Me does that from the posting page in one click and keeps a Word resume in its own design. Before you see a tailored resume, a check removes any skill or claim your original resume doesn&rsquo;t support, so nothing goes out that you can&rsquo;t back up in an interview. The code is MIT licensed on{' '}
              <a href="https://github.com/TheLinc/cover-me" target="_blank" rel="noopener noreferrer">GitHub</a>, and the two can work together: Rezi to build the resume once, Cover Me to tailor it for each application.
            </p>
          ),
        },
      ]}
      faq={faqJsonLd}
      cta={{
        title: 'Tailor your resume on the posting',
        body: 'Free with your own API key, or 10 hosted generations to start, then 5 a week. No credit card required.',
      }}
    />
  )
}
