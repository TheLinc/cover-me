import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LogoHeader } from '@/components/site/SiteNav'
import { UninstallSurvey } from './UninstallSurvey'

// Not in sitemap.ts: only people who just removed the extension land here.
export const metadata: Metadata = {
  title: 'Why did you remove Cover Me?',
  robots: { index: false },
}

export default function UninstalledPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LogoHeader />

      <main className="max-w-xl mx-auto px-6 py-20">
        <Suspense>
          <UninstallSurvey />
        </Suspense>
      </main>
    </div>
  )
}
