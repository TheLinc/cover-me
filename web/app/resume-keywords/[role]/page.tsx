import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SendToComputer } from '@/components/site/SendToComputer'
import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteNav } from '@/components/site/SiteNav'
import { PER_COMPANY } from '@/lib/role-keywords'
import { FETCHED, ROLES, getRole } from '@/lib/roles'
import { BASE, OG_IMAGE } from '@/lib/structured-data'
import { cn, longDate, month, storeUrl } from '@/lib/utils'

const BUTTON = 'inline-flex items-center gap-2 font-semibold text-[14px] px-5 py-2.5 rounded-[8px] transition-colors'
const PRIMARY = cn(BUTTON, 'bg-brand-strong text-white hover:bg-brand-deep')
const OUTLINE = cn(BUTTON, 'border border-border text-foreground hover:bg-elevated')

export function generateStaticParams() {
  return ROLES.map((r) => ({ role: r.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ role: string }> }): Promise<Metadata> {
  const role = getRole((await params).role)
  if (!role) return {}
  const url = `${BASE}/resume-keywords/${role.slug}`
  const title = `${role.metaTitle} | Cover Me`
  return {
    title: role.metaTitle,
    description: role.metaDescription,
    alternates: { canonical: url },
    openGraph: { title, description: role.metaDescription, url, siteName: 'Cover Me', type: 'website', images: [OG_IMAGE] },
    twitter: { card: 'summary_large_image', title, description: role.metaDescription, images: [OG_IMAGE.url] },
  }
}

const list = (names: string[]) => new Intl.ListFormat('en-GB', { type: 'conjunction' }).format(names)
const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1)

export default async function RolePage({ params }: { params: Promise<{ role: string }> }) {
  const role = getRole((await params).role)
  if (!role) notFound()

  const { counts } = role
  const url = `${BASE}/resume-keywords/${role.slug}`
  const h1 = `${role.name} resume keywords`
  const top = counts.keywords[0]
  const sources = Object.entries(counts.sources).filter(([, n]) => n > 0)

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
        { '@type': 'ListItem', position: 2, name: 'Resume keywords', item: `${BASE}/resume-keywords` },
        { '@type': 'ListItem', position: 3, name: h1, item: url },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: `${h1} counted from ${counts.postings} job postings`,
      description: role.metaDescription,
      url,
      dateModified: FETCHED,
      isAccessibleForFree: true,
      creator: { '@type': 'Organization', name: 'Cover Me', url: BASE },
      measurementTechnique: 'Keywords read from public Greenhouse and Lever job postings with the Cover Me ATS checker',
    },
  ]

  const others = ROLES.filter((r) => r.slug !== role.slug)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteNav />

      <main className="max-w-[900px] mx-auto px-8 py-20 max-md:px-5">
        <div className="mb-12 max-w-[680px]">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2 mb-4 flex flex-wrap gap-x-3">
            <Link href="/resume-keywords" className="hover:text-foreground">Resume keywords</Link>
            <span aria-hidden className="max-sm:hidden">·</span>
            <time dateTime={FETCHED}>Updated {longDate(FETCHED)}</time>
          </p>
          <h1 className="text-[clamp(32px,5vw,52px)] text-foreground leading-[0.98] mb-5">{h1}</h1>
          <p className="text-[17px] text-foreground leading-[1.7] mb-5 font-medium">
            {capitalize(list(counts.keywords.slice(0, 5).map((k) => k.name)))} are the keywords {role.noun} job postings ask for most. Of the {counts.postings} postings
            read in {month(FETCHED)}, {top.postings} ask for {top.name}.
          </p>
          {role.intro.map((p) => (
            <p key={p.slice(0, 40)} className="text-[15px] text-muted-foreground leading-[1.85] mb-4">{p}</p>
          ))}
        </div>

        <section className="mb-14">
          <h2 className="text-[24px] text-foreground mb-3">What {role.noun} postings ask for</h2>
          <p className="text-[14px] text-muted-foreground leading-[1.8] mb-6 max-w-[680px]">
            {counts.postings} {role.noun} postings from {counts.companies} companies, read on {longDate(FETCHED)} from their public job boards on{' '}
            {list(sources.map(([name, n]) => `${name} (${n})`))}. The titles read were {role.titles}. A keyword counts when the posting asks for it as a
            requirement or a nice-to-have, read with the same rules as the <Link href="/ats-checker" className="text-brand-strong underline underline-offset-2 hover:text-brand-deep">free ATS checker</Link>.
            At most {PER_COMPANY} postings come from any one company, and a keyword fewer than 3 companies ask for is left out.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Keyword</TableHead>
                <TableHead className="text-right">Postings that ask for it</TableHead>
                <TableHead className="w-[38%] max-sm:hidden"><span className="sr-only">Share of postings</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {counts.keywords.map((k) => (
                <TableRow key={k.name}>
                  <TableCell className="font-medium">{k.name}</TableCell>
                  <TableCell className="text-right tabular-nums whitespace-nowrap">{k.postings} of {counts.postings}</TableCell>
                  <TableCell className="max-sm:hidden" aria-hidden>
                    <div className="h-2 rounded-full bg-elevated">
                      <div className="h-2 rounded-full bg-brand" style={{ width: `${(k.postings / counts.postings) * 100}%` }} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        <div className="soft-card p-10 text-center mb-16 max-sm:p-6">
          <h2 className="text-[22px] text-foreground mb-3">Check your resume against one posting</h2>
          <p className="text-[15px] text-muted-foreground mb-6 max-w-[480px] mx-auto leading-[1.7]">
            These counts show what {role.noun} jobs ask for in general. Paste the posting you&apos;re applying to into the free ATS checker to see which of its keywords
            your resume is missing, or install Cover Me to tailor your resume to it.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link href="/ats-checker" className={PRIMARY}>Check my resume free</Link>
            <a
              href={storeUrl('resume-keywords')}
              target="_blank"
              rel="noreferrer"
              className={cn(OUTLINE, '[@media(pointer:coarse)]:hidden')}
            >
              Install free · Chrome
            </a>
            <SendToComputer
              placement="resume-keywords"
              className={cn(OUTLINE, '[@media(pointer:fine)]:hidden')}
            >
              Send this to my computer
            </SendToComputer>
          </div>
        </div>

        <div className="text-[13px] text-muted-foreground leading-[1.9]">
          <span className="font-semibold text-foreground">Keywords for other jobs: </span>
          {others.map((r, i) => (
            <span key={r.slug}>
              <Link href={`/resume-keywords/${r.slug}`} className="text-brand-light hover:text-brand transition-colors">{r.name}</Link>
              {i < others.length - 1 && ' · '}
            </span>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
