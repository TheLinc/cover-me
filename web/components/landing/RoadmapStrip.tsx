import Link from 'next/link'
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr'
import { getRoadmap } from '@/lib/roadmap'
import { FeatureRequest, RoadmapCard } from '@/components/roadmap/RoadmapCard'
import { Eyebrow } from '@/components/site/Eyebrow'

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
        {upcoming.map((item) => <li key={item.number}><RoadmapCard item={item} /></li>)}
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
