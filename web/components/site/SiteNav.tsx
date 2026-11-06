'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ListIcon } from '@phosphor-icons/react/dist/ssr'
import { Button } from '@/components/ui/button'
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn, CHROME_STORE_URL } from '@/lib/utils'
import type { NavLink } from './app-links'

const MARKETING_LINKS: NavLink[] = [
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#ats-score', label: 'ATS score' },
  { href: '/#pricing', label: 'Pricing' },
  { href: '/guides', label: 'Guides' },
  { href: '/roadmap', label: 'Roadmap' },
  { href: '/about', label: 'About' },
]

// `actions` replaces the default Sign in / Install buttons (signed-in pages pass Sign out).
// `links` replaces the marketing links (signed-in pages pass APP_LINKS).
export function SiteNav({ actions, links }: { actions?: ReactNode; links?: NavLink[] }) {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  // Guides keep one SiteNav across pages, so Back with the menu open must close it.
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => setMenuOpen(false), [pathname])
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
      <div className="container flex h-16 items-center gap-8 max-sm:gap-2">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <Image src="/logo.png" width={28} height={28} alt="" className="rounded-[8px]" />
          <span className={cn('text-[18px] font-semibold tracking-[-0.02em] text-ink', links && 'max-sm:sr-only')}>Cover Me</span>
        </Link>
        <nav aria-label="Main" className={cn('flex flex-1 gap-1', !links && 'max-lg:hidden')}>
          {(links ?? MARKETING_LINKS).map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={pathname === l.href ? 'page' : undefined}
              className="rounded-full px-3 py-1.5 text-[14px] font-medium text-ink-2 transition-colors hover:bg-panel hover:text-ink aria-[current=page]:bg-panel aria-[current=page]:text-ink max-sm:px-2.5 max-sm:text-[13px]"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {actions ?? (
            <>
              <Button asChild variant="ghost" size="sm" className="max-lg:hidden">
                <Link href="/auth">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <a href={CHROME_STORE_URL} target="_blank" rel="noreferrer">
                  Install free
                </a>
              </Button>
            </>
          )}
          {!links && (
            // Below lg the marketing links and Sign in live in this sheet.
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu" className="lg:hidden">
                  <ListIcon size={22} aria-hidden />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" aria-describedby={undefined} className="bg-paper px-4 pt-16">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <nav aria-label="Main" className="flex flex-col gap-1">
                  {[...MARKETING_LINKS, ...(actions ? [] : [{ href: '/auth', label: 'Sign in' }])].map((l) => (
                    <SheetClose asChild key={l.href}>
                      <Link
                        href={l.href}
                        aria-current={pathname === l.href ? 'page' : undefined}
                        className="flex h-11 items-center rounded-full px-4 text-[15px] font-medium text-ink-2 transition-colors hover:bg-panel hover:text-ink aria-[current=page]:bg-panel aria-[current=page]:text-ink"
                      >
                        {l.label}
                      </Link>
                    </SheetClose>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>
    </header>
  )
}
