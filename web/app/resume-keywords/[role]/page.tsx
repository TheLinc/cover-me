import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SendToComputer } from '@/components/site/SendToComputer'
import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteNav } from '@/components/site/SiteNav'
import { KINDS, MIN_COMPANIES, PER_COMPANY, TOP, kindOf } from '@/lib/role-keywords'
import { FETCHED, ROLES, answers, getRole, lead, percent } from '@/lib/roles'
import { BASE, OG_IMAGE } from '@/lib/structured-data'
import { cn, longDate, storeUrl } from '@/lib/utils'

const LINK = 'text-brand-strong underline underline-offset-2 hover:text-brand-deep'
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

export default async function RolePage({ params }: { params: Promise<{ role: string }> }) {
  const role = getRole((await params).role)
  if (!role) notFound()

  const { counts } = role
  const url = `${BASE}/resume-keywords/${role.slug}`
  const h1 = `${role.name} resume keywords`
  const tools = counts.keywords.filter((k) => kindOf(k.name) === 'Tools and software')
  const skills = counts.keywords.filter((k) => kindOf(k.name) === 'Skills')
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
          <p className="text-[17px] text-foreground leading-[1.7] mb-5 font-medium">{lead(role)}</p>
          {role.intro.map((p) => (
            <p key={p.slice(0, 40)} className="text-[15px] text-muted-foreground leading-[1.85] mb-4">{p}</p>
          ))}
        </div>

        <section className="mb-14">
          <h2 className="text-[24px] text-foreground mb-3">What {role.noun} postings ask for</h2>
          <p className="text-[14px] text-muted-foreground leading-[1.8] mb-4 max-w-[680px]">
            {counts.postings} {role.noun} postings from {counts.companies} companies, read on {longDate(FETCHED)} from their public job boards on{' '}
            {list(sources.map(([name, n]) => `${name} (${n})`))}. The titles read were {role.titles}. A keyword counts when the posting asks for it as a
            requirement or a nice-to-have, read with the same rules as the <Link href="/ats-checker" className={LINK}>free ATS checker</Link>.
            At most {PER_COMPANY} postings come from any one company. A keyword fewer than {MIN_COMPANIES} companies ask for is left out, and the table
            stops at the top {TOP}.
          </p>
          <p className="text-[14px] text-muted-foreground leading-[1.8] mb-8 max-w-[680px]">
            The job boards read belong to mostly tech companies, so software terms such as AI may rank higher here than they would across all
            employers.
          </p>
          {KINDS.map((kind) => {
            const rows = counts.keywords.filter((k) => kindOf(k.name) === kind)
            if (!rows.length) return null
            return (
              <div key={kind} className="mb-10">
                <h3 className="text-[17px] font-bold text-foreground tracking-[-0.3px] mb-2">{kind}</h3>
                <Table className="table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%] max-sm:w-[50%]">Keyword</TableHead>
                      <TableHead className="w-[14%] max-sm:w-[18%] text-right">Share</TableHead>
                      <TableHead className="w-[22%] max-sm:w-[32%] text-right">Postings that ask for it</TableHead>
                      <TableHead className="w-[24%] max-sm:hidden" aria-hidden />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((k) => (
                      <TableRow key={k.name}>
                        <TableCell className="font-medium">{k.name}</TableCell>
                        <TableCell className="text-right tabular-nums">{`${percent(role, k)}%`}</TableCell>
                        <TableCell className="text-right tabular-nums whitespace-nowrap">{`${k.postings} of ${counts.postings}`}</TableCell>
                        <TableCell className="max-sm:hidden" aria-hidden>
                          <div className="h-2 rounded-full bg-elevated">
                            <div className="h-2 rounded-full bg-brand" style={{ width: `${percent(role, k)}%` }} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          })}
        </section>

        <section className="mb-14 max-w-[680px]">
          <h2 className="text-[24px] text-foreground mb-4">Where to put these keywords</h2>
          <ul className="space-y-3 text-[15px] text-muted-foreground leading-[1.8] mb-6">
            <li>
              <strong className="text-foreground">Summary.</strong> Name your title and the two or three keywords that fit you best
              {tools[0] && skills[0] ? `, such as ${tools[0].name} or ${skills[0].name}` : ''}.
            </li>
            <li>
              <strong className="text-foreground">Skills section.</strong> List the tools you have used by name, in the posting&apos;s words
              {tools.length > 1 ? `: ${list(tools.slice(0, 4).map((k) => k.name))}` : ''}.
            </li>
            <li>
              <strong className="text-foreground">Experience bullets.</strong> Put each keyword next to a result, so a recruiter sees what you did with it.
            </li>
          </ul>
          <h3 className="text-[17px] font-bold text-foreground tracking-[-0.3px] mb-3">Example {role.noun} resume bullets</h3>
          <ul className="list-disc pl-5 space-y-2 text-[15px] text-muted-foreground leading-[1.8] mb-4">
            {role.bullets.map((b) => <li key={b}>{b}</li>)}
          </ul>
          <p className="text-[14px] text-muted-foreground leading-[1.8]">
            The numbers in these bullets are made up. For the whole process, see{' '}
            <Link href="/guides/tailor-resume-to-job-description" className={LINK}>how to tailor your resume to a job description</Link>.
          </p>
        </section>

        {answers(role).map(({ q, a }) => (
          <section key={q} className="mb-10 max-w-[680px]">
            <h2 className="text-[22px] text-foreground mb-3">{q}</h2>
            <p className="text-[15px] text-muted-foreground leading-[1.85]">{a}</p>
          </section>
        ))}

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
