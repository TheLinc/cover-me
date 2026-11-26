import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { serif } from '@/components/site/GuideArticle'
import { Card, CardContent } from '@/components/ui/card'
import { GUIDES, newestFirst } from '@/lib/guides'
import { cn, longDate } from '@/lib/utils'
import { OG_IMAGE } from '@/lib/structured-data'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'
const DESCRIPTION = "Guides on ATS scores and formats, tailoring a resume, ChatGPT prompts, reviews of Jobscan, Teal and AIApply, and Cover Me compared with ChatGPT and Rezi."

export const metadata: Metadata = {
  title: 'Job Search Guides: ATS Scores and Tailoring',
  description: DESCRIPTION,
  alternates: { canonical: `${BASE}/guides` },
  openGraph: {
    title: 'Job application guides | Cover Me',
    description: DESCRIPTION,
    url: `${BASE}/guides`,
    siteName: 'Cover Me',
    type: 'website',
    images: [OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Job application guides | Cover Me',
    description: DESCRIPTION,
    images: [OG_IMAGE.url],
  },
}

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
    { '@type': 'ListItem', position: 2, name: 'Guides', item: `${BASE}/guides` },
  ],
}

export default function GuidesPage() {
  return (
    <main className="mx-auto max-w-[1040px] px-8 py-20 max-md:px-5 max-md:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <div className="mb-12 max-w-[640px]">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2 mb-4 block">
          Guides
        </span>
        <h1 className={cn(serif.className, 'mb-5 text-[clamp(34px,5vw,52px)] leading-[1.08] tracking-[-0.02em] text-foreground')}>
          Job application guides
        </h1>
        <p className="text-[16px] text-muted-foreground leading-[1.75]">
          Answers to the questions that decide whether your application gets read, from the developer of Cover Me, an open-source Chrome extension that tailors your resume and writes your cover letter.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {newestFirst(GUIDES).map((g, i) => (
          <Link key={g.slug} href={`/guides/${g.slug}`} className="group rounded-[16px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Card className="h-full overflow-hidden rounded-[16px] transition-colors group-hover:border-brand">
              <Image
                src={g.image}
                alt={g.imageAlt}
                width={1600}
                height={900}
                priority={i < 2}
                sizes="(max-width: 767px) 100vw, 472px"
                className="h-auto w-full border-b border-line"
              />
              <CardContent className="p-6 max-sm:p-5">
                <h2 className={cn(serif.className, 'mb-2 text-[22px] leading-[1.25] tracking-[-0.01em] text-ink group-hover:text-brand-strong transition-colors')}>
                  {g.title}
                </h2>
                <p className="mb-4 text-[14px] leading-[1.7] text-ink-2">{g.description}</p>
                <time dateTime={g.updated ?? g.date} className="font-mono text-[11px] uppercase tracking-[0.1em] text-subtle">
                  Updated {longDate(g.updated ?? g.date)}
                </time>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  )
}
