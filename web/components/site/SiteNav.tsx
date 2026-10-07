'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { cn, CHROME_STORE_URL } from '@/lib/utils'

const LINKS = [
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#ats-score', label: 'ATS score' },
  { href: '/#pricing', label: 'Pricing' },
  { href: '/guides', label: 'Guides' },
  { href: '/about', label: 'About' },
]

// `actions` replaces the default Sign in / Install buttons (the dashboard passes Sign out).
export function SiteNav({ actions }: { actions?: ReactNode }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b border-line bg-[rgba(245,243,242,0.88)] backdrop-blur-md transition-shadow duration-300',
        scrolled && 'shadow-[0_10px_30px_-18px_rgba(30,27,75,0.35)]',
      )}
    >
      <div className="container flex h-16 items-center gap-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <Image src="/logo.png" width={28} height={28} alt="" className="rounded-[8px]" />
          <span className="text-[18px] font-semibold tracking-[-0.02em] text-ink">Cover Me</span>
        </Link>
        <nav aria-label="Main" className="flex flex-1 gap-1 max-md:hidden">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-full px-3 py-1.5 text-[14px] font-medium text-ink-2 transition-colors hover:bg-panel hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {actions ?? (
            <>
              <Button asChild variant="ghost" size="sm" className="max-sm:hidden">
                <Link href="/auth">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <a href={CHROME_STORE_URL} target="_blank" rel="noreferrer">
                  Install free
                </a>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
