'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ListIcon } from '@phosphor-icons/react/dist/ssr'
import { Button, buttonVariants } from '@/components/ui/button'
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn, storeUrl } from '@/lib/utils'
import { hasSessionCookie } from '@/lib/session-cookie'
import type { NavLink } from './app-links'
import { BAR, SiteLogo } from './LogoHeader'
import { PhoneReturnBanner, SendToComputer } from './SendToComputer'

const MARKETING_LINKS: NavLink[] = [
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#answers', label: 'Application questions' },
  { href: '/ats-checker', label: 'ATS checker' },
  { href: '/#pricing', label: 'Pricing' },
]

export function SiteNav({ actions, links }: { actions?: ReactNode; links?: NavLink[] }) {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  // Guides share one SiteNav across pages, so a route change must close the menu (#135).
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => setMenuOpen(false), [pathname])
  const [signedIn, setSignedIn] = useState(false)
  useEffect(() => setSignedIn(hasSessionCookie(document.cookie)), [])
  const account = signedIn ? { href: '/dashboard', label: 'Dashboard' } : { href: '/auth', label: 'Sign in' }
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <header className={cn(BAR, 'transition-shadow duration-300', scrolled && 'shadow-[0_10px_30px_-18px_rgba(30,27,75,0.35)]')}>
        <div className="container flex h-16 items-center gap-8 max-sm:gap-2">
          <SiteLogo href={links ? '/dashboard' : '/'} compact={!!links} />
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
                  <Link href={account.href}>{account.label}</Link>
                </Button>
                <Button asChild size="sm" className="[@media(pointer:coarse)]:hidden">
                  <a href={storeUrl('nav')} target="_blank" rel="noreferrer">
                    Install free
                  </a>
                </Button>
                <SendToComputer placement="nav" className={buttonVariants({ size: 'sm', className: '[@media(pointer:fine)]:hidden' })}>
                  Send to computer
                </SendToComputer>
              </>
            )}
            {!links && (
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Open menu" className="lg:hidden">
                    <ListIcon size={22} aria-hidden />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" aria-describedby={undefined} className="bg-paper px-4 pt-16">
                  <SheetTitle className="sr-only">Menu</SheetTitle>
                  <nav aria-label="Main" className="flex flex-col gap-1">
                    {[...MARKETING_LINKS, ...(actions ? [] : [account])].map((l) => (
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
      {!links && <PhoneReturnBanner />}
    </>
  )
}
