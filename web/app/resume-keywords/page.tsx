import type { Metadata } from 'next'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteNav } from '@/components/site/SiteNav'
import { FETCHED, ROLES } from '@/lib/roles'
import { BASE, OG_IMAGE } from '@/lib/structured-data'
import { longDate } from '@/lib/utils'

const PAGE_URL = `${BASE}/resume-keywords`
const TITLE = 'Resume Keywords by Job, From Real Postings'
const DESCRIPTION =
  'The skills, tools and degrees job postings ask for most, counted from real postings for sales, marketing and engineering jobs, with the share of postings for each.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: `${TITLE} | Cover Me`, description: DESCRIPTION, url: PAGE_URL, siteName: 'Cover Me', type: 'website', images: [OG_IMAGE] },
  twitter: { card: 'summary_large_image', title: `${TITLE} | Cover Me`, description: DESCRIPTION, images: [OG_IMAGE.url] },
}

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
    { '@type': 'ListItem', position: 2, name: 'Resume keywords', item: PAGE_URL },
  ],
}

export default function ResumeKeywordsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <SiteNav />

      <main className="max-w-[900px] mx-auto px-8 py-20 max-md:px-5">
        <div className="mb-12 max-w-[680px]">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2 mb-4">
            <time dateTime={FETCHED}>Updated {longDate(FETCHED)}</time>
          </p>
          <h1 className="text-[clamp(32px,5vw,52px)] text-foreground leading-[0.98] mb-5">Resume keywords by job</h1>
          <p className="text-[17px] text-foreground leading-[1.7] mb-5 font-medium">
            Each page counts the skills, tools and certifications that real job postings for one kind of job ask for, read from companies&apos; public job
            boards on Greenhouse and Lever. The boards read belong to mostly tech companies. Use the keywords that match your experience, in the words the postings use.
          </p>
          <p className="text-[15px] text-muted-foreground leading-[1.85]">
            To check your resume against the one posting you&apos;re applying to, use the{' '}
            <Link href="/ats-checker" className="text-brand-strong underline underline-offset-2 hover:text-brand-deep">free ATS checker</Link>.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {ROLES.map((r) => (
            <Link key={r.slug} href={`/resume-keywords/${r.slug}`} className="group rounded-[16px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Card className="h-full rounded-[16px] transition-colors group-hover:border-brand">
                <CardContent className="p-6 max-sm:p-5">
                  <h2 className="mb-2 text-[20px] text-ink group-hover:text-brand-strong transition-colors">{r.name} resume keywords</h2>
                  <p className="mb-3 text-[14px] leading-[1.7] text-ink-2">
                    {r.counts.keywords.slice(0, 4).map((k) => k.name).join(', ')}
                  </p>
                  <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-subtle">{r.counts.postings} postings read</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
