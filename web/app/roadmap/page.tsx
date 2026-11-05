import type { Metadata } from 'next'
import { SiteNav } from '@/components/site/SiteNav'
import { SiteFooter } from '@/components/site/SiteFooter'
import { FeatureRequest, RoadmapCard } from '@/components/landing/RoadmapStrip'
import { getRoadmap, type RoadmapItem } from '@/lib/roadmap'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'
const DESCRIPTION = "What's new in Cover Me and what's coming next."

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Roadmap',
  description: DESCRIPTION,
  alternates: { canonical: `${BASE}/roadmap` },
  openGraph: { title: 'Cover Me roadmap', description: DESCRIPTION, url: `${BASE}/roadmap`, siteName: 'Cover Me', type: 'website' },
}

function Group({ title, items }: { title: string; items: RoadmapItem[] }) {
  if (items.length === 0) return null
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-[22px] text-ink">{title}</h2>
      <ul className="flex flex-col gap-3">
        {items.map((item) => <RoadmapCard key={item.number} item={item} />)}
      </ul>
    </section>
  )
}

export default async function RoadmapPage() {
  const roadmap = (await getRoadmap()) ?? { rollingOut: [], upcoming: [], shipped: [] }
  const empty = roadmap.rollingOut.length + roadmap.upcoming.length + roadmap.shipped.length === 0
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-2xl px-6 py-20">
        <div className="mb-12">
          <h1 className="mb-3 text-[36px] text-foreground">Roadmap</h1>
          <p className="text-[16px] leading-[1.7] text-muted-foreground">{DESCRIPTION}</p>
        </div>
        {empty ? (
          <p className="text-[15px] text-ink-2">Nothing to show right now. Check back soon.</p>
        ) : (
          <div className="flex flex-col gap-12">
            <Group title="Rolling out" items={roadmap.rollingOut} />
            <Group title="Upcoming" items={roadmap.upcoming} />
            <Group title="Recently shipped" items={roadmap.shipped} />
          </div>
        )}
        <div className="mt-14 text-center">
          <FeatureRequest />
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
