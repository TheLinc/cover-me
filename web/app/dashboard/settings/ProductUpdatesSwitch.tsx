'use client'

import { useState } from 'react'
import { saveProductUpdates } from '@/lib/email-preferences'
import { Switch } from '@/components/ui/switch'

// Consent to product-update emails (#114). Account emails (confirm, reset
// password) don't depend on it. Saves at once; shows the old state again if
// the save fails.
export function ProductUpdatesSwitch({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function toggle(next: boolean) {
    setOn(next)
    setSaving(true)
    setError('')
    const data = await saveProductUpdates(next, 'dashboard').catch(() => ({ error: 'Could not reach the server. Please try again.' }))
    if ('error' in data && data.error) {
      setOn(!next)
      setError(data.error)
    }
    setSaving(false)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2.5">
        <Switch id="product-updates" checked={on} disabled={saving} onCheckedChange={toggle} />
        <label htmlFor="product-updates" className="cursor-pointer text-[13.5px] text-ink-2">
          Email me about new features (a few times a year)
        </label>
      </div>
      {error && <p role="alert" className="text-[12px] leading-snug text-destructive">{error}</p>}
    </div>
  )
}
