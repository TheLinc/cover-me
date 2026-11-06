'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CaretDownIcon } from '@phosphor-icons/react'
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

// The signed-in pages' top right (#133). `signOutTo` is where signing out
// lands: the redeem page passes its own link, so the gift can go to another account.
export function AccountMenu({ email, avatar, signOutTo = '/' }: { email: string; avatar: string | null; signOutTo?: string }) {
  const [avatarFailed, setAvatarFailed] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  async function signOut() {
    setSigningOut(true)
    await createClient().auth.signOut()
    window.location.href = signOutTo
  }

  return (
    <DropdownMenu>
      {/* Named by the email: shown on desktop, read out on phones too. */}
      <DropdownMenuTrigger
        className="flex items-center gap-2 rounded-full p-1 pr-2.5 text-[14px] font-medium text-ink-2 transition-colors hover:bg-panel hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand data-[state=open]:bg-panel max-sm:pr-1"
      >
        <span aria-hidden className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-tint text-[14px] font-semibold text-brand-ink">
          {avatar && !avatarFailed ? (
            // A plain img: next/image would need Google's image host allowed in next.config.
            <img src={avatar} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" onError={() => setAvatarFailed(true)} />
          ) : (
            email[0]?.toUpperCase() ?? '?'
          )}
        </span>
        <span className="max-w-[220px] truncate max-sm:sr-only">{email}</span>
        <CaretDownIcon size={12} aria-hidden className="max-sm:hidden" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[220px]">
        <DropdownMenuLabel className="truncate font-normal text-ink-2">{email}</DropdownMenuLabel>
        <DropdownMenuItem asChild><Link href="/dashboard/settings">Settings</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link href="/dashboard/support">Support</Link></DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={signingOut} onSelect={(e) => { e.preventDefault(); signOut() }}>
          {signingOut ? <><Spinner className="size-3.5" />Signing out</> : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
