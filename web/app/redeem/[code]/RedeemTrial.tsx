'use client'

import { useState } from 'react'
import Link from 'next/link'
import posthog from 'posthog-js'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { LocalDate } from '@/app/dashboard/LocalDate'
import { TRIAL_REDEEMED, whenPosthogLoaded } from '@/lib/analytics'
import { redeemTrial } from '@/lib/billing'
import { CHROME_STORE_URL } from '@/lib/utils'
import { confettiFrom } from './confetti'

// One click starts the trial. The billing function checks the code and the
// account; the Stripe webhook then turns Pro on, usually within seconds.
export function RedeemTrial({ code, email }: { code: string; email: string }) {
  const [state, setState] = useState<{ status: 'idle' | 'loading' } | { status: 'done'; trialEnd: string } | { status: 'error'; error: string }>({ status: 'idle' })

  async function redeem(e: React.MouseEvent<HTMLButtonElement>) {
    // Where the button is now: the success view replaces it, and the confetti starts there.
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect()
    setState({ status: 'loading' })
    try {
      const data = await redeemTrial(code)
      if (data.trialEnd) {
        const note = data.note ?? null
        whenPosthogLoaded(posthog, () => { posthog.capture(TRIAL_REDEEMED, { note }) })
        confettiFrom(left + width / 2, top + height / 2)
        setState({ status: 'done', trialEnd: data.trialEnd })
      } else {
        setState({ status: 'error', error: data.error ?? 'Something went wrong. Please try again.' })
      }
    } catch {
      setState({ status: 'error', error: 'Could not reach the server. Please try again.' })
    }
  }

  if (state.status === 'done') {
    return (
      <>
        {/* Focused on mount: the button that had focus is gone */}
        <h1 ref={(el) => el?.focus()} tabIndex={-1} className="text-[34px] font-semibold leading-tight tracking-[-0.03em] outline-none">
          You&apos;re on Pro until <LocalDate iso={state.trialEnd} options={{ month: 'long', day: 'numeric' }} />
        </h1>
        <p className="mt-4 text-[15px] text-muted-foreground">
          If the Cover Me extension is already installed, Pro is already on. Otherwise add it to Chrome and sign in with {email}.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <a href={CHROME_STORE_URL} target="_blank" rel="noreferrer">Add to Chrome</a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
        </div>
      </>
    )
  }

  return (
    <>
      <h1 className="text-[34px] font-semibold leading-tight tracking-[-0.03em]">Start your free week of Pro</h1>
      <p className="mt-4 text-[15px] text-muted-foreground">
        25 letters and resumes a day for 7 days on {email}. No card needed. When the week ends you&apos;re back on the free plan unless you upgrade.
      </p>
      <Button size="lg" className="mt-8" onClick={redeem} disabled={state.status === 'loading'}>
        {state.status === 'loading' ? <><Spinner className="size-4" />Starting</> : 'Start my free week'}
      </Button>
      <p role="alert" className="mt-4 text-sm text-destructive">{state.status === 'error' ? state.error : ''}</p>
    </>
  )
}
