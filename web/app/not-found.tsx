import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { SiteNav } from '@/components/site/SiteNav'
import { SiteFooter } from '@/components/site/SiteFooter'

export const metadata: Metadata = {
  title: '404 — Cover Me',
}

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col">

      <SiteNav />

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-5">
        <div
          className="text-center flex flex-col items-center gap-5 max-w-[480px]"
          style={{ animation: 'fadeUp 0.5s ease both' }}
        >
          <p className="text-[clamp(72px,12vw,120px)] font-extrabold leading-none tracking-[-4px] text-[rgba(255,255,255,0.06)] select-none">
            404
          </p>
          <div className="-mt-4">
            <h1 className="text-[28px] font-extrabold tracking-[-0.8px] text-foreground mb-2">
              Page not found.
            </h1>
            <p className="text-[15px] text-muted-foreground leading-[1.7]">
              The page you&apos;re looking for doesn&apos;t exist or has been moved.
            </p>
          </div>
          <div className="mt-2">
            <Button asChild>
              <Link href="/">Go home</Link>
            </Button>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  )
}
