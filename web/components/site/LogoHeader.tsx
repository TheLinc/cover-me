import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export const BAR = 'sticky top-0 z-50 border-b border-line bg-[rgba(245,243,242,0.88)] backdrop-blur-md'

export function SiteLogo({ href, compact }: { href: string; compact?: boolean }) {
  return (
    <Link href={href} className="flex shrink-0 items-center gap-2.5">
      <Image src="/logo.png" width={28} height={28} alt="" className="rounded-[8px]" />
      <span className={cn('text-[18px] font-semibold tracking-[-0.02em] text-ink', compact && 'max-sm:sr-only')}>Cover Me</span>
    </Link>
  )
}

// For pages people reach from a link outside the site, which have nothing to navigate to. (#311)
export function LogoHeader({ href = '/' }: { href?: string }) {
  return (
    <header className={BAR}>
      <div className="container flex h-16 items-center">
        <SiteLogo href={href} />
      </div>
    </header>
  )
}
