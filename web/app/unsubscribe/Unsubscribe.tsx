'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { unsubscribe } from '@/lib/email-preferences'

const FAILED = "Couldn't unsubscribe right now. Please try again."

export function Unsubscribe() {
  const token = useSearchParams().get('token')
  const [state, setState] = useState<{ done?: boolean; error?: string }>(
    token ? {} : { error: 'This unsubscribe link is incomplete. Open it from the email again.' },
  )

  useEffect(() => {
    if (!token) return
    unsubscribe(token)
      .then((r) => setState(r.unsubscribed ? { done: true } : { error: r.error ?? FAILED }))
      .catch(() => setState({ error: FAILED }))
  }, [token])

  if (state.error) {
    return (
      <>
        <h1 className="text-[40px] font-bold leading-[1.05] tracking-[-1.2px]">Unsubscribe didn&apos;t work</h1>
        <p role="alert" className="mt-4 text-muted-foreground">{state.error}</p>
        <p className="mt-2 text-muted-foreground">
          You can also turn emails off on your <a href="/dashboard" className="text-brand-strong underline underline-offset-4">dashboard</a>.
        </p>
      </>
    )
  }
  if (!state.done) {
    return <p role="status" className="text-muted-foreground">Unsubscribing…</p>
  }
  return (
    <>
      <h1 className="text-[40px] font-bold leading-[1.05] tracking-[-1.2px]">You&apos;re unsubscribed</h1>
      <p role="status" className="mt-4 text-muted-foreground">
        Cover Me won&apos;t send you product updates or other non-account email. Account emails, like password resets, still arrive.
      </p>
      <p className="mt-2 text-muted-foreground">
        Changed your mind? Turn product updates back on from your <a href="/dashboard" className="text-brand-strong underline underline-offset-4">dashboard</a>.
      </p>
    </>
  )
}
