import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Suspense } from 'react'
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
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="Cover Me" width={26} height={26} className="rounded-md" />
            <span className="font-bold text-[15px] tracking-[-0.3px]">Cover Me</span>
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-24 text-center">
        <Suspense>
          <Unsubscribe />
        </Suspense>
      </main>
    </div>
  )
}
