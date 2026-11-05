import Link from 'next/link'
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr'
import { getRoadmap, type RoadmapItem } from '@/lib/roadmap'
import { Eyebrow } from '@/components/site/Eyebrow'

const SUPPORT_EMAIL = 'support@cover-me.dev'

// The group heading names the status, so a card carries no status pill.
export function RoadmapCard({ item }: { item: RoadmapItem }) {
  return (
    <li className="soft-card flex flex-col gap-2 px-6 py-5">
      {item.shipped && <span className="text-[12px] text-subtle">{item.shipped}</span>}
      <h3 className="text-[17px] font-medium tracking-[-0.01em] text-ink">{item.title}</h3>
      {item.blurb && <p className="text-[15px] leading-[1.6] text-ink-2">{item.blurb}</p>}
    </li>
  )
}

export function FeatureRequest() {
  return (
    <p className="text-[14px] text-ink-2">
      Want a feature added? Email us at{' '}
      <a href={`mailto:${SUPPORT_EMAIL}`} className="whitespace-nowrap font-medium text-brand-strong hover:underline">{SUPPORT_EMAIL}</a>
    </p>
  )
}

// Landing teaser: the 3 newest upcoming items. Hidden when there are none.
export async function RoadmapStrip() {
  const upcoming = (await getRoadmap())?.upcoming.slice(0, 3) ?? []
  if (upcoming.length === 0) return null
  return (
    <section className="container py-20 max-md:py-14">
      <div className="mx-auto flex max-w-[1040px] flex-col items-center gap-3 text-center">
        <Eyebrow>Roadmap</Eyebrow>
        <h2 className="text-[clamp(32px,3.6vw,44px)] leading-[1.05]">What&apos;s coming next</h2>
      </div>
      <ul className="mx-auto mt-10 grid max-w-[1040px] gap-3 text-left md:grid-cols-3">
        {upcoming.map((item) => <RoadmapCard key={item.number} item={item} />)}
      </ul>
      <div className="mt-8 flex flex-col items-center gap-3 text-center">
        <Link href="/roadmap" className="inline-flex items-center gap-1.5 text-[15px] font-medium text-brand-strong hover:underline">
          See the full roadmap <ArrowRightIcon size={14} aria-hidden="true" />
        </Link>
        <FeatureRequest />
      </div>
    </section>
  )
}
