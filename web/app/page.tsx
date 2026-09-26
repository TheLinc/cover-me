import { jsonLdApp, jsonLdHowTo, jsonLdSpeakable } from '@/lib/structured-data'
import { SiteNav } from '@/components/site/SiteNav'
import { SiteFooter } from '@/components/site/SiteFooter'
import { CutLine } from '@/components/brand/CutLine'
import { Hero } from '@/components/landing/Hero'
import { BoardsTape } from '@/components/landing/BoardsTape'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { AtsFit } from '@/components/landing/AtsFit'
import { Swatches } from '@/components/landing/Swatches'
import { OpenSource } from '@/components/landing/OpenSource'
import { Pricing } from '@/components/landing/Pricing'
import { Compare } from '@/components/landing/Compare'
import { Faq } from '@/components/landing/Faq'

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdApp) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdHowTo) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSpeakable) }} />
      <SiteNav />
      <main className="relative">
        <div className="thread-line" aria-hidden="true" />
        <Hero />
        <BoardsTape />
        <HowItWorks />
        <CutLine className="container" />
        <AtsFit />
        <CutLine className="container" />
        <Swatches />
        <OpenSource />
        <Pricing />
        <CutLine className="container" />
        <Compare />
        <CutLine className="container" />
        <Faq />
      </main>
      <SiteFooter />
    </>
  )
}
