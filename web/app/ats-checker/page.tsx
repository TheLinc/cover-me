import type { Metadata } from 'next'
import Link from 'next/link'
import { AtsChecker } from '@/components/site/AtsChecker'
import { CheckIcon } from '@phosphor-icons/react/dist/ssr'
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
    featureList: [
      "Lists the posting's must-have and nice-to-have skills, tools and certifications",
      'Highlights each keyword in your resume and in the posting',
      'Counts the experience bullets with a number and quotes the ones without',
      "Checks whether the posting's job title is on your resume",
      'Checks for an email address, a phone number and the page count',
      'Reads PDF and Word files in the browser; nothing is uploaded',
    ],
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
      <main className="container flex flex-col gap-12 py-10 max-md:py-6">
        <div className="-mb-6 flex flex-col gap-3">
          <h1 className="text-[clamp(30px,4vw,44px)] leading-[1.05]">Free ATS resume checker</h1>
          <p className="max-w-[640px] text-[16px] leading-[1.55] text-ink-2">
            See which of the posting&apos;s skills, tools and certifications your resume has, and where they are.
          </p>
          <ul className="flex flex-wrap gap-2 text-[13px] text-ink-2 max-sm:gap-x-3 max-sm:gap-y-1 max-sm:text-[12.5px]">
            {['No sign-up', 'Nothing you paste leaves your browser', 'PDF, Word or text'].map((t) => (
              <li key={t} className="flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1 max-sm:border-0 max-sm:bg-transparent max-sm:p-0">
                <CheckIcon size={12} weight="bold" className="text-brand" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <AtsChecker />

        <div className="flex max-w-[720px] flex-col gap-3 text-[15px] leading-[1.65] text-body">
          <h2 className="text-[22px] leading-[1.2] text-ink">How the checker reads a posting</h2>
          <p>
            It looks for more than 500 named skills, tools, licenses and degrees, and for acronyms and product names in the
            posting&apos;s requirements and duty bullets. Keywords under headings like Requirements or Qualifications count as must-have,
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
