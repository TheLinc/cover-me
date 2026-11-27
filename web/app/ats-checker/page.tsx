import type { Metadata } from 'next'
import Link from 'next/link'
import { AtsChecker } from '@/components/site/AtsChecker'
import { FileTextIcon, ShieldCheckIcon, UserMinusIcon } from '@phosphor-icons/react/dist/ssr'
import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteNav } from '@/components/site/SiteNav'
import { BASE, OG_IMAGE } from '@/lib/structured-data'

const PAGE_URL = `${BASE}/ats-checker`
const TITLE = 'Free ATS Resume Checker: Find Missing Keywords | Cover Me'
const DESCRIPTION =
  "Paste a job posting and your resume, or upload a PDF or Word file, to see which of the posting's keywords you have and which you're missing. Free and no sign-up. Your resume is sent to Anthropic to check it, and we don't store it."

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
    name: 'Free ATS resume checker',
    url: PAGE_URL,
    description: DESCRIPTION,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript',
    isAccessibleForFree: true,
    featureList: [
      'Scores the resume out of 100 the same way as the Cover Me extension',
      "Lists the posting's must-have and nice-to-have skills, tools and certifications",
      'Checks years of experience and other hard requirements against the resume',
      'Highlights each keyword in your resume and in the posting',
      'Counts the experience bullets with a number and quotes the ones without',
      "Checks whether the posting's job title is on your resume",
      'Checks for an email address, a phone number and the page count',
      "Reads PDF and Word files; the text goes to Anthropic to check it and isn't stored",
    ],
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'Free ATS resume checker', item: PAGE_URL },
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
          <p className="text-[16px] leading-[1.55] text-ink-2">
            Get an ATS match score and see which of the posting&apos;s skills, tools and certifications your resume has, and where they are.
          </p>
          <ul className="flex flex-wrap gap-2 text-[13px] text-ink-2 max-sm:gap-x-3 max-sm:gap-y-1 max-sm:text-[12.5px]">
            {([[UserMinusIcon, 'No sign-up'], [ShieldCheckIcon, "We don't store your resume"], [FileTextIcon, 'PDF, Word or text']] as const).map(([Icon, t]) => (
              <li key={t} className="flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1 max-sm:border-0 max-sm:bg-transparent max-sm:p-0">
                <Icon size={14} weight="bold" className="text-brand" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <AtsChecker />

        <div className="flex max-w-[720px] flex-col gap-3 text-[15px] leading-[1.65] text-body">
          <h2 className="text-[22px] leading-[1.2] text-ink">How the checker scores a resume</h2>
          <p>
            It sends the posting and your resume to Claude, Anthropic&apos;s AI. Claude picks the posting&apos;s must-have and
            nice-to-have keywords and judges which ones your resume shows by meaning, not spelling: &quot;B.S.,
            Accounting&quot; counts as a bachelor&apos;s degree, but HubSpot doesn&apos;t count for Salesforce. It also checks
            hard requirements, such as years of experience, against the dates on your resume. Cover Me doesn&apos;t store the
            posting or your resume.
          </p>
          <p>
            The score uses the same keyword rules and the same math as the ATS match score in the Cover Me extension.
            Must-haves are worth 70 points and nice-to-haves 30, and each unmet hard requirement that isn&apos;t already a
            missing keyword takes off 10, up to 25. If the AI check can&apos;t run, the page uses a quick word match instead and shows a count, not a score. Read{' '}
            <Link href="/guides/what-is-an-ats-score" className="text-brand-strong underline underline-offset-2">what an ATS score is</Link>{' '}
            or{' '}
            <Link href="/guides/tailor-resume-to-job-description" className="text-brand-strong underline underline-offset-2">how to tailor your resume to a job description</Link>.
          </p>
          <p>
            To add the missing keywords in ChatGPT or Claude, use these{' '}
            <Link href="/guides/chatgpt-resume-prompts" className="text-brand-strong underline underline-offset-2">ChatGPT resume prompts</Link>, tested on a real
            posting.
          </p>
          <p>
            To see which keywords come up across many postings for your kind of job, read the{' '}
            <Link href="/resume-keywords" className="text-brand-strong underline underline-offset-2">resume keywords by job</Link>, counted from real postings.
          </p>
          <p>
            To see how this checker&apos;s free limits compare with Jobscan, SkillSyncer, Teal and eight others, read the{' '}
            <Link href="/guides/best-free-ats-resume-checkers" className="text-brand-strong underline underline-offset-2">best free ATS resume checkers, compared</Link>.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
