'use client'

import { useState } from 'react'
import Link from 'next/link'
import { GearSixIcon, LifebuoyIcon, SignOutIcon } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

const ITEM = 'gap-2.5 rounded-[10px] px-2.5 py-2 text-[13.5px] text-ink focus:bg-panel focus:text-ink [&_svg]:size-[18px] [&_svg]:text-subtle'

// The signed-in pages' top right (#133): the avatar alone, opening the
// account menu. `signOutTo` is where signing out lands: the redeem page passes
// its own link, so the gift can go to another account.
export function AccountMenu({ email, avatar, signOutTo = '/' }: { email: string; avatar: string | null; signOutTo?: string }) {
  const [avatarFailed, setAvatarFailed] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  async function signOut() {
    setSigningOut(true)
    await createClient().auth.signOut()
    window.location.href = signOutTo
  }

  const face = (size: string) => (
    <span aria-hidden className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-tint font-semibold text-brand-ink', size)}>
      {avatar && !avatarFailed ? (
        // A plain img: next/image would need Google's image host allowed in next.config.
        <img src={avatar} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" onError={() => setAvatarFailed(true)} />
      ) : (
        email[0]?.toUpperCase() ?? '?'
      )}
    </span>
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="rounded-full p-0.5 ring-1 ring-transparent transition-[box-shadow,background-color] hover:bg-panel hover:ring-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-paper data-[state=open]:bg-panel data-[state=open]:ring-line"
      >
        {face('size-9 text-[14px]')}
        <span className="sr-only">Account menu for {email}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-[248px] rounded-[16px] border-line bg-surface p-1.5 shadow-[0_1px_2px_rgba(30,27,75,0.06),0_16px_36px_-18px_rgba(30,27,75,0.35)]">
        <DropdownMenuLabel className="flex items-center gap-2.5 px-2.5 py-2 font-normal">
          {face('size-8 text-[13px]')}
          <span className="min-w-0 truncate text-[13px] text-ink-2">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="mx-1 bg-line" />
        <DropdownMenuItem asChild className={ITEM}>
          <Link href="/dashboard/settings"><GearSixIcon aria-hidden />Settings</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className={ITEM}>
          <Link href="/dashboard/support"><LifebuoyIcon aria-hidden />Support</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="mx-1 bg-line" />
        <DropdownMenuItem className={ITEM} disabled={signingOut} onSelect={(e) => { e.preventDefault(); signOut() }}>
          {signingOut ? <><Spinner className="size-[18px]" />Signing out</> : <><SignOutIcon aria-hidden />Sign out</>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
