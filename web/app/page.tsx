import { jsonLdApp, jsonLdHowTo, jsonLdSpeakable } from '@/lib/structured-data'
import { getLatestVersion } from '@/lib/changelog'
import { SiteNav } from '@/components/site/SiteNav'
import { SiteFooter } from '@/components/site/SiteFooter'
import { Hero } from '@/components/landing/Hero'
import { BoardsStrip } from '@/components/landing/BoardsStrip'
import { RunStory } from '@/components/landing/RunStory'
import { FoundInSearch } from '@/components/landing/FoundInSearch'
import { NoFakes } from '@/components/landing/NoFakes'
import { JourneyDock } from '@/components/landing/JourneyDock'
import { Stats } from '@/components/landing/Stats'
import { Features } from '@/components/landing/Features'
import { PrivacyBand } from '@/components/landing/PrivacyBand'
import { Pricing } from '@/components/landing/Pricing'
import { RoadmapStrip } from '@/components/landing/RoadmapStrip'
import { Faq } from '@/components/landing/Faq'
import { ClosingCta } from '@/components/landing/ClosingCta'

// Revalidated hourly so softwareVersion follows a new release.
export const revalidate = 3600

export default async function Home() {
  const version = await getLatestVersion()
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdApp(version)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdHowTo) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSpeakable) }} />
      <SiteNav />
      <main>
        <Hero />
        <BoardsStrip />
        <RunStory />
        <FoundInSearch />
        <Stats />
        <NoFakes />
        <Features />
        <PrivacyBand />
        <Pricing />
        <RoadmapStrip />
        <Faq />
        <ClosingCta />
      </main>
      <JourneyDock />
      <SiteFooter />
    </>
  )
}
