import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Source_Serif_4 } from 'next/font/google'
import { CHROME_STORE_URL, cn } from '@/lib/utils'
import { type Guide, guideArticleJsonLd, guideBreadcrumbJsonLd, readingMinutes, slugify } from '@/lib/guides'
import { GuideToc, GuideTocCollapsed } from './GuideToc'

const serif = Source_Serif_4({ subsets: ['latin'], weight: '600', display: 'swap' })

export type GuideSection = { title: string; id?: string; body: ReactNode }

type FaqJsonLd = { mainEntity: { name: string; acceptedAnswer: { text: string } }[] }

const FAQ_TITLE = 'Frequently asked questions'

const H2 = ({ id, children, className }: { id: string; children: ReactNode; className?: string }) => (
  <h2 id={id} className={cn(serif.className, 'scroll-mt-24 text-[clamp(26px,3.2vw,34px)] leading-[1.15] tracking-[-0.015em]', className)}>
    {children}
  </h2>
)

// Captioned product graphic on a tinted panel, placed in the section it explains.
export function GuideFigure({ caption, children }: { caption: ReactNode; children: ReactNode }) {
  return (
    <figure className="!my-10">
      <div className="rounded-[16px] bg-panel p-6 max-sm:p-4">{children}</div>
      <figcaption className="mt-3 text-[14px] leading-[1.6] text-subtle">{caption}</figcaption>
    </figure>
  )
}

export function GuideArticle({
  guide,
  hero,
  lede,
  tldr,
  intro,
  sections,
  faq,
  cta,
}: {
  guide: Guide
  hero?: { src: string; alt: string }
  lede: ReactNode
  tldr?: string[] | ReactNode
  intro?: ReactNode
  sections: GuideSection[]
  faq: FaqJsonLd
  cta: { title: string; body: ReactNode }
}) {
  const withIds = sections.map((s) => ({ ...s, id: s.id ?? slugify(s.title) }))
  const contents = [...withIds, { id: 'faq', title: FAQ_TITLE }]
  const updated = guide.updated ?? guide.date
  const minutes = readingMinutes([lede, tldr, intro, sections.map((s) => s.body)])

  return (
    <main className="mx-auto max-w-[1040px] px-8 pb-24 pt-16 max-md:px-5 max-md:pt-10 lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-x-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(guideArticleJsonLd(guide, hero?.src)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(guideBreadcrumbJsonLd(guide)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />

      <aside className="pt-[52px] max-lg:hidden">
        <GuideToc items={contents} />
      </aside>

      <article className="min-w-0 max-w-[680px]">
        <header className="mb-10">
          <Link href="/guides" className="text-[13px] font-semibold text-brand-strong transition-colors hover:text-brand-deep">
            ← All guides
          </Link>
          <h1 className={cn(serif.className, 'mb-5 mt-5 text-[clamp(34px,5vw,52px)] leading-[1.08] tracking-[-0.02em]')}>{guide.title}</h1>
          <p className="text-[20px] leading-[1.6] text-ink-2 max-sm:text-[18px]">{lede}</p>
          <p className="mt-6 flex flex-wrap gap-x-3 gap-y-1 border-t border-line pt-4 font-mono text-[11.5px] uppercase tracking-[0.08em] text-subtle">
            <time dateTime={updated}>
              Updated {new Date(`${updated}T00:00:00`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </time>
            <span aria-hidden>·</span>
            <span>Lincoln Laylor</span>
            <span aria-hidden>·</span>
            <span>{minutes} min read</span>
          </p>
        </header>

        {hero && (
          <Image
            src={hero.src}
            alt={hero.alt}
            width={1600}
            height={900}
            priority
            sizes="(max-width: 800px) 100vw, 680px"
            className="mb-10 h-auto w-full rounded-[16px] border border-line"
          />
        )}

        <GuideTocCollapsed items={contents} />

        <div className="guide-prose">
          {tldr && (
            <div className="rounded-[16px] border border-line bg-surface p-6">
              <h2 id="tldr" className="mb-3 font-mono text-[12px] uppercase tracking-[0.1em] text-brand-ink">
                TL;DR
              </h2>
              {Array.isArray(tldr) ? (
                <ul className="list-disc space-y-2 pl-5 text-[16px] leading-[1.65] text-ink marker:text-brand">
                  {tldr.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              ) : (
                tldr
              )}
            </div>
          )}
          {intro}
          {withIds.map((s) => (
            <section key={s.id}>
              <H2 id={s.id}>{s.title}</H2>
              {s.body}
            </section>
          ))}
          <section>
            <H2 id="faq">{FAQ_TITLE}</H2>
            <div className="divide-y divide-line border-y border-line">
              {faq.mainEntity.map((item) => (
                <div key={item.name} className="py-6">
                  <h3 className="mb-2 text-[18px] tracking-[-0.01em]">{item.name}</h3>
                  <p>{item.acceptedAnswer.text}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-16 rounded-[16px] border border-line bg-surface px-8 py-10 text-center max-sm:px-5">
          <h2 id="get-cover-me" className={cn(serif.className, 'mb-3 text-[28px] leading-[1.2]')}>
            {cta.title}
          </h2>
          <div className="mx-auto mb-6 max-w-[460px] space-y-3 text-[15px] leading-[1.7] text-ink-2 [&_a]:text-brand-strong hover:[&_a]:text-brand-deep">
            {cta.body}
          </div>
          <a
            href={CHROME_STORE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-[8px] bg-brand-strong px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-brand-deep"
          >
            Install free · Chrome
          </a>
        </div>
      </article>
    </main>
  )
}
