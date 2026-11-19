import type { Metadata } from 'next'
import Link from 'next/link'
import { AtsChecker } from '@/components/site/AtsChecker'
import { Eyebrow } from '@/components/site/Eyebrow'
import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteNav } from '@/components/site/SiteNav'
import { BASE, OG_IMAGE } from '@/lib/structured-data'

const PAGE_URL = `${BASE}/ats-checker`
const TITLE = 'Free ATS Resume Checker: Find Missing Keywords | Cover Me'
const DESCRIPTION =
  "Paste a job posting and your resume, or upload a PDF or Word file, to see which of the posting's keywords you have and which you're missing. Free, no sign-up, and nothing leaves your browser."

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, siteName: 'Cover Me', type: 'website', images: [OG_IMAGE] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: [OG_IMAGE.url] },
}

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Cover Me ATS keyword checker',
    url: PAGE_URL,
    description: DESCRIPTION,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'ATS checker', item: PAGE_URL },
    ],
  },
]

export default function AtsCheckerPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteNav />
      <main className="container flex flex-col gap-12 py-16 max-md:py-10">
        <div className="flex max-w-[720px] flex-col gap-4">
          <Eyebrow>Free ATS checker</Eyebrow>
          <h1 className="text-[clamp(32px,5vw,52px)] leading-[1.02]">Check your resume against a job posting&apos;s keywords</h1>
          <p className="text-[17px] leading-[1.6] text-ink-2">
            Recruiters search and filter applicants in their tracking system by the posting&apos;s skills, tools and
            certifications. Paste a posting and your resume to see which ones you have and which you&apos;re missing. No account, and
            the text never leaves this page.
          </p>
        </div>

        <AtsChecker />

        <div className="flex max-w-[720px] flex-col gap-3 text-[15px] leading-[1.65] text-body">
          <h2 className="text-[22px] leading-[1.2] text-ink">How the checker reads a posting</h2>
          <p>
            It looks for more than 400 named skills, tools, licenses and degrees, and for acronyms and product names in the
            posting&apos;s requirement lines. Keywords under headings like Requirements or Qualifications count as must-have,
            and ones marked preferred or nice to have count as nice to have. It then checks each keyword against your resume
            word by word, so &quot;PowerBI&quot; matches &quot;Power BI&quot; but &quot;managed projects&quot; doesn&apos;t match
            &quot;project management&quot;.
          </p>
          <p>
            It shows a count, not a score out of 100. The match score in the Cover Me extension comes from an AI that reads
            the whole posting, so the two would give different numbers for the same resume. Read{' '}
            <Link href="/guides/what-is-an-ats-score" className="text-brand-strong underline underline-offset-2">what an ATS score is</Link>{' '}
            or{' '}
            <Link href="/guides/tailor-resume-to-job-description" className="text-brand-strong underline underline-offset-2">how to tailor your resume to a job description</Link>.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
