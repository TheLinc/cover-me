import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Suspense } from 'react'
import { UninstallSurvey } from './UninstallSurvey'

// Not in sitemap.ts: only people who just removed the extension land here.
export const metadata: Metadata = {
  title: 'Why did you remove Cover Me?',
  robots: { index: false },
}

export default function UninstalledPage() {
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

      <main className="max-w-xl mx-auto px-6 py-20">
        <Suspense>
          <UninstallSurvey />
        </Suspense>
      </main>
    </div>
  )
}
