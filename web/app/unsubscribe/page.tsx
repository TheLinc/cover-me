import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LogoHeader } from '@/components/site/SiteNav'
import { Unsubscribe } from './Unsubscribe'

export const metadata: Metadata = {
  title: 'Unsubscribe',
  robots: { index: false },
}

// Where the unsubscribe link in every non-account email lands (#114), signed
// in or not. The link carries a signed token; opening the page unsubscribes.
export default function UnsubscribePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LogoHeader />

      <main className="max-w-2xl mx-auto px-6 py-24 text-center">
        <Suspense>
          <Unsubscribe />
        </Suspense>
      </main>
    </div>
  )
}
