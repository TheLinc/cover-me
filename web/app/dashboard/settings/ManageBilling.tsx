'use client'

import { useState } from 'react'
import { ArrowUpRightIcon } from '@phosphor-icons/react'
import { openBilling } from '@/lib/billing'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

// Opens the Stripe customer portal.
export function ManageBilling() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function open() {
    setLoading(true)
    setError('')
    try {
      const data = await openBilling('portal')
      if (data.url) {
        window.location.href = data.url
        return
      }
      setError(data.error ?? 'Something went wrong. Please try again.')
    } catch {
      setError('Could not reach the server. Please try again.')
    }
    setLoading(false)
  }

  return (
    <>
      <Button variant="outline" size="sm" className="rounded-full" onClick={open} disabled={loading}>
        {loading ? <><Spinner className="size-3.5" />Loading</> : <>Manage billing <ArrowUpRightIcon size={12} aria-hidden /></>}
      </Button>
      {error && <p className="text-[12px] leading-snug text-destructive">{error}</p>}
    </>
  )
}
