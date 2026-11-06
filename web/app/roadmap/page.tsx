import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteNav } from '@/components/site/SiteNav'
import { SiteFooter } from '@/components/site/SiteFooter'
import { FeatureRequest } from '@/components/roadmap/RoadmapCard'
import { RoadmapTimeline } from '@/components/roadmap/RoadmapTimeline'
import { getRoadmap } from '@/lib/roadmap'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cover-me.dev'
const DESCRIPTION = "What's new in Cover Me and what's coming next."

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Roadmap',
  description: DESCRIPTION,
  alternates: { canonical: `${BASE}/roadmap` },
  openGraph: { title: 'Cover Me roadmap', description: DESCRIPTION, url: `${BASE}/roadmap`, siteName: 'Cover Me', type: 'website' },
}

export default async function RoadmapPage() {
  const roadmap = await getRoadmap()
  const groups = [
    { title: 'Rolling out', items: roadmap?.rollingOut ?? [] },
    { title: 'Upcoming', items: roadmap?.upcoming ?? [] },
    { title: 'Recently shipped', items: roadmap?.shipped ?? [] },
  ].filter((g) => g.items.length > 0)
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-5xl px-6 py-20">
        <div className="mx-auto mb-14 max-w-2xl md:text-center">
          <h1 className="mb-3 text-[36px] text-foreground">Roadmap</h1>
          <p className="text-[16px] leading-[1.7] text-muted-foreground">{DESCRIPTION}</p>
        </div>
        {groups.length === 0
          ? <p className="text-[15px] text-ink-2 md:text-center">Nothing to show right now. Check back soon.</p>
          : <RoadmapTimeline groups={groups} />}
        <p className="mt-10 text-center text-[14px]">
          <Link href="/changelog" className="font-medium text-brand-strong hover:underline">See every release</Link>
        </p>
        <div className="mt-16 text-center">
          <FeatureRequest />
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
