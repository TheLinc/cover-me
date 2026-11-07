import type { Metadata } from 'next'
import Link from 'next/link'
import { GUIDES } from '@/lib/guides'
import { OG_IMAGE } from '@/lib/structured-data'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'
const DESCRIPTION = "Job search guides on ATS scores, ATS-friendly resume formats and tailoring your resume, plus Cover Me compared with ChatGPT, AIApply, Jobscan, Teal and Rezi."

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
    <main className="max-w-[900px] mx-auto px-8 py-20 max-md:px-5">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <div className="mb-14 max-w-[640px]">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2 mb-4 block">
          Guides
        </span>
        <h1 className="text-[clamp(32px,5vw,52px)] text-foreground leading-[0.98] mb-5">
          Job application guides
        </h1>
        <p className="text-[16px] text-muted-foreground leading-[1.75]">
          Answers to the questions that decide whether your application gets read, from the developer of Cover Me, an open-source Chrome extension that tailors your resume and writes your cover letter.
        </p>
      </div>

      <div className="divide-y divide-dashed divide-line border-t-[1.5px] border-ink">
        {GUIDES.map((g) => (
          <Link key={g.slug} href={`/guides/${g.slug}`} className="block py-8 group">
            <h2 className="text-[20px] text-foreground mb-2 group-hover:text-brand-light transition-colors">
              {g.title}
            </h2>
            <p className="text-[14px] text-muted-foreground leading-[1.75] max-w-[640px] mb-2">
              {g.description}
            </p>
            <time dateTime={g.updated ?? g.date} className="font-mono text-[11px] uppercase tracking-[0.1em] text-dim">
              Updated {new Date(`${g.updated ?? g.date}T00:00:00`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </time>
          </Link>
        ))}
      </div>
    </main>
  )
}
