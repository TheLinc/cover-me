import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cn, longDate, storeUrl } from '@/lib/utils'
import { OG_IMAGE } from '@/lib/structured-data'
import { BOARDS, getBoard } from '@/lib/boards'
import { SiteNav } from '@/components/site/SiteNav'
import { SendToComputer } from '@/components/site/SendToComputer'
import { SiteFooter } from '@/components/site/SiteFooter'

const INSTALL = 'inline-flex items-center gap-2 bg-brand-strong text-white font-semibold text-[14px] px-5 py-2.5 rounded-[8px] hover:bg-brand-deep transition-colors'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'

export function generateStaticParams() {
  return BOARDS.map((b) => ({ board: b.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ board: string }> }): Promise<Metadata> {
  const board = getBoard((await params).board)
  if (!board) return {}
  return {
    title: board.metaTitle,
    description: board.metaDescription,
    alternates: { canonical: `${BASE}/for/${board.slug}` },
    openGraph: {
      title: `${board.metaTitle} | Cover Me`,
      description: board.metaDescription,
      url: `${BASE}/for/${board.slug}`,
      siteName: 'Cover Me',
      type: 'website',
      images: [OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${board.metaTitle} | Cover Me`,
      description: board.metaDescription,
      images: [OG_IMAGE.url],
    },
  }
}

export default async function BoardPage({ params }: { params: Promise<{ board: string }> }) {
  const board = getBoard((await params).board)
  if (!board) notFound()

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
      { '@type': 'ListItem', position: 2, name: `Cover Me for ${board.name}`, item: `${BASE}/for/${board.slug}` },
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: board.faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }

  const pageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: board.h1,
    description: board.metaDescription,
    url: `${BASE}/for/${board.slug}`,
    dateModified: board.updated,
  }

  const otherBoards = BOARDS.filter((b) => b.slug !== board.slug)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <SiteNav />

      <main className="max-w-[900px] mx-auto px-8 py-20 max-md:px-5">
        <div className="mb-14 max-w-[680px]">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2 mb-4 flex flex-wrap gap-x-3">
            <span>Cover Me for {board.name}</span>
            <span aria-hidden className="max-sm:hidden">·</span>
            <time dateTime={board.updated}>Updated {longDate(board.updated)}</time>
          </p>
          <h1 className="text-[clamp(32px,5vw,52px)] text-foreground leading-[0.98] mb-5">
            {board.h1}
          </h1>
          {/* Direct-answer paragraph, kept concise for featured snippets (#88) */}
          <p className="text-[17px] text-foreground leading-[1.7] mb-5 font-medium">
            {board.answer}
          </p>
          {board.intro.map((p) => (
            <p key={p.slice(0, 40)} className="text-[15px] text-muted-foreground leading-[1.85] mb-4">
              {p}
            </p>
          ))}
          {board.related && (
            <p className="text-[15px] text-muted-foreground leading-[1.85] mb-4">
              {board.related.lead}{' '}
              <Link
                href={board.related.href}
                {...(/^https?:/.test(board.related.href) && { target: '_blank', rel: 'noopener noreferrer' })}
                className="text-brand-strong underline underline-offset-2 hover:text-brand-deep"
              >
                {board.related.label}
              </Link>
              .
            </p>
          )}
        </div>

        <div className="mb-12 h-px bg-line" />
        <section className="mb-16">
          <h2 className="text-[24px] text-foreground mb-8">
            How does Cover Me work on {board.name}?
          </h2>
          <ol className="space-y-7 list-none">
            {board.steps.map((s, i) => (
              <li key={s.title} className="flex gap-5">
                <span className="font-mono text-[11px] text-brand-strong tracking-[0.08em] pt-[5px] shrink-0 w-7">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="text-[16px] font-bold text-foreground tracking-[-0.3px] mb-1.5">{s.title}</h3>
                  <p className="text-[14px] text-muted-foreground leading-[1.8] max-w-[600px]">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <div className="mb-12 h-px bg-line" />
        <section className="mb-16">
          <h2 className="text-[24px] text-foreground mb-6">
            Common questions about {board.name} applications
          </h2>
          <div className="divide-y divide-border border-t border-border max-w-[720px]">
            {board.faqs.map(({ q, a }) => (
              <div key={q} className="py-6">
                <h3 className="text-[16px] font-bold text-foreground tracking-[-0.3px] mb-2.5 leading-[1.35]">{q}</h3>
                <p className="text-[14px] text-muted-foreground leading-[1.8]">{a}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="soft-card p-10 text-center mb-16">
          <h2 className="text-[22px] text-foreground mb-3">
            Try it on your next {board.name} application
          </h2>
          <p className="text-[15px] text-muted-foreground mb-6 max-w-[460px] mx-auto leading-[1.7]">
            Free forever with your own API key, or 10 hosted generations to start, then 5 a week. No credit card required.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <a
              href={storeUrl('for-board')}
              target="_blank"
              rel="noreferrer"
              className={cn(INSTALL, '[@media(pointer:coarse)]:hidden')}
            >
              Install free · Chrome
            </a>
            <SendToComputer placement="for-board" className={cn(INSTALL, '[@media(pointer:fine)]:hidden')}>
              Send this to my computer
            </SendToComputer>
            <Link
              href="/guides/tailor-resume-to-job-description"
              className="inline-flex items-center gap-2 border border-border text-foreground font-semibold text-[14px] px-5 py-2.5 rounded-[8px] hover:bg-elevated transition-colors"
            >
              Learn about resume tailoring
            </Link>
          </div>
        </div>

        <div className="text-[13px] text-muted-foreground leading-[1.9]">
          <span className="font-semibold text-foreground">Also works on: </span>
          {otherBoards.map((b, i) => (
            <span key={b.slug}>
              <Link href={`/for/${b.slug}`} className="text-brand-light hover:text-brand transition-colors">
                {b.name}
              </Link>
              {i < otherBoards.length - 1 && ' · '}
            </span>
          ))}
          . On any other site, paste the job description into Cover Me.
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
