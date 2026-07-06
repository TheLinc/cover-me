import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CHROME_STORE_URL } from '@/lib/utils'
import { BOARDS, getBoard } from '@/lib/boards'

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
      title: `${board.metaTitle} — Cover Me`,
      description: board.metaDescription,
      url: `${BASE}/for/${board.slug}`,
      siteName: 'Cover Me',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${board.metaTitle} — Cover Me`,
      description: board.metaDescription,
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

  const otherBoards = BOARDS.filter((b) => b.slug !== board.slug)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      {/* Nav */}
      <nav className="sticky top-0 z-20 bg-[rgba(13,17,23,0.92)] backdrop-blur-2xl border-b border-border">
        <div className="max-w-[900px] mx-auto px-8 h-[58px] flex items-center justify-between max-md:px-5">
          <Link href="/" className="flex items-center gap-[9px] text-[15px] font-bold text-foreground tracking-[-0.3px]">
            <Image src="/logo.png" width={22} height={22} alt="Cover Me" />
            Cover Me
          </Link>
          <a
            href={CHROME_STORE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 bg-brand text-white font-semibold text-[13px] px-4 py-2 rounded-[7px] hover:bg-brand/90 transition-colors"
          >
            Install free
          </a>
        </div>
      </nav>

      <main className="max-w-[900px] mx-auto px-8 py-20 max-md:px-5">
        {/* Header */}
        <div className="mb-14 max-w-[680px]">
          <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-brand mb-4 block">
            Cover Me for {board.name}
          </span>
          <h1 className="text-[clamp(32px,5vw,52px)] font-extrabold tracking-[-2px] text-foreground leading-[0.98] mb-5">
            {board.h1}
          </h1>
          {/* Direct-answer paragraph — kept concise for featured snippets */}
          <p className="text-[17px] text-foreground leading-[1.7] mb-5 font-medium">
            {board.answer}
          </p>
          {board.intro.map((p) => (
            <p key={p.slice(0, 40)} className="text-[15px] text-muted-foreground leading-[1.85] mb-4">
              {p}
            </p>
          ))}
        </div>

        {/* Steps */}
        <section className="mb-16">
          <h2 className="text-[24px] font-bold text-foreground tracking-[-0.6px] mb-8">
            How does Cover Me work on {board.name}?
          </h2>
          <ol className="space-y-7 list-none">
            {board.steps.map((s, i) => (
              <li key={s.title} className="flex gap-5">
                <span className="text-[11px] font-bold text-brand tracking-[0.08em] pt-[5px] shrink-0 w-7">
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

        {/* FAQ */}
        <section className="mb-16">
          <h2 className="text-[24px] font-bold text-foreground tracking-[-0.6px] mb-6">
            {board.name} + Cover Me — common questions
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

        {/* CTA */}
        <div className="border border-border rounded-[12px] p-10 bg-surface text-center mb-16">
          <h2 className="text-[22px] font-bold text-foreground tracking-[-0.5px] mb-3">
            Try it on your next {board.name} application
          </h2>
          <p className="text-[15px] text-muted-foreground mb-6 max-w-[460px] mx-auto leading-[1.7]">
            Free forever with your own API key, or 10 hosted generations per day. No credit card required.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <a
              href={CHROME_STORE_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-brand text-white font-semibold text-[14px] px-5 py-2.5 rounded-[8px] hover:bg-brand/90 transition-colors"
            >
              Install free · Chrome
            </a>
            <Link
              href="/guides/tailor-resume-to-job-description"
              className="inline-flex items-center gap-2 border border-border text-foreground font-semibold text-[14px] px-5 py-2.5 rounded-[8px] hover:bg-elevated transition-colors"
            >
              Learn about resume tailoring
            </Link>
          </div>
        </div>

        {/* Other boards */}
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
          {' '}— and any other job board via manual paste.
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-8">
        <div className="max-w-[900px] mx-auto px-8 py-8 max-md:px-5 flex items-center justify-between text-[13px] text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">← Cover Me</Link>
          <div className="flex gap-5">
            <Link href="/guides" className="hover:text-foreground transition-colors">Guides</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/support" className="hover:text-foreground transition-colors">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
