'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

// `to` is where to land after signing out: the redeem page passes its own
// link, so the gift can go to another account.
export function SignOutButton({ to = '/' }: { to?: string }) {
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    await createClient().auth.signOut()
    window.location.href = to
  }

  return (
    <Button variant="outline" size="sm" onClick={handleSignOut} disabled={signingOut}>
      {signingOut ? <><Spinner className="size-3.5" />Signing out</> : 'Sign out'}
    </Button>
  )
}
