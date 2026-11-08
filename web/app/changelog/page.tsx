import type { Metadata } from 'next'
import { OG_IMAGE } from '@/lib/structured-data'
import Link from 'next/link'
import { SiteNav } from '@/components/site/SiteNav'
import { SiteFooter } from '@/components/site/SiteFooter'
import { getChangelog, type ChangelogVersion } from '@/lib/changelog'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'
const DESCRIPTION = 'What changed in each version of the Cover Me extension.'

// For search results and link previews; DESCRIPTION is the line under the H1.
const META_DESCRIPTION = "New features and fixes in each release of the Cover Me Chrome extension, from resume tailoring and cover letters to the ATS score and job tracking."

export const revalidate = 3600

export const metadata: Metadata = {
  title: { absolute: "Cover Me changelog: what's new in each version" },
  description: META_DESCRIPTION,
  alternates: { canonical: `${BASE}/changelog` },
  openGraph: { title: "Cover Me changelog: what's new in each version", description: META_DESCRIPTION, url: `${BASE}/changelog`, siteName: 'Cover Me', type: 'website', images: [OG_IMAGE] },
  twitter: { card: 'summary_large_image', title: "Cover Me changelog: what's new in each version", description: META_DESCRIPTION, images: [OG_IMAGE.url] },
}

function Group({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[13px] font-medium text-subtle">{title}</h3>
      <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[15px] leading-[1.6] text-ink-2 marker:text-line">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  )
}

// The popup's "What's new" link lands on #v<version>; see .changelog-version
// in globals.css for the highlight.
function Version({ version: v }: { version: ChangelogVersion }) {
  return (
    <section id={`v${v.version}`} aria-labelledby={`v${v.version}-title`} className="changelog-version soft-card flex scroll-mt-24 flex-col gap-4 px-6 py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 id={`v${v.version}-title`} className="text-[20px] font-medium tracking-[-0.01em] text-ink">Version {v.version}</h2>
        <time className="text-[13px] text-subtle">{v.date}</time>
      </div>
      {v.new.length === 0 && v.fixed.length === 0
        ? <p className="text-[15px] text-ink-2">Fixes and small improvements</p>
        : <>
            <Group title="New" items={v.new} />
            <Group title="Fixed" items={v.fixed} />
          </>}
    </section>
  )
}

export default async function ChangelogPage() {
  const versions = await getChangelog()
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-2xl px-6 py-20">
        <div className="mb-14 md:text-center">
          <h1 className="mb-3 text-[36px] text-foreground">Changelog</h1>
          <p className="text-[16px] leading-[1.7] text-muted-foreground">{DESCRIPTION}</p>
        </div>
        {versions?.length
          ? <div className="flex flex-col gap-6">{versions.map((v) => <Version key={v.version} version={v} />)}</div>
          : <p className="text-[15px] text-ink-2 md:text-center">Nothing to show right now. Check back soon.</p>}
        <p className="mt-16 text-center text-[14px] text-ink-2">
          Coming next? See the <Link href="/roadmap" className="font-medium text-brand-strong hover:underline">roadmap</Link>.
        </p>
      </main>
      <SiteFooter />
    </div>
  )
}
