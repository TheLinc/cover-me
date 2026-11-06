'use client'

import { useState } from 'react'
import { sendSupport, siteHost, type SupportResult, type SupportType } from '@/lib/support'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'

const TYPES: Array<[SupportType, string]> = [
  ['problem', "Something isn't working"],
  ['feature', 'Feature request'],
  ['account', 'Account or billing'],
  ['job_site', 'Request a job site'],
  ['other', 'Something else'],
]
const MAX_MESSAGE = 1000
const ERRORS = {
  limited: "You've sent a few messages already today. If it can't wait, email support@cover-me.dev.",
  failed: "Couldn't send that. Please try again, or email support@cover-me.dev.",
}

export function SupportForm({ email }: { email: string }) {
  const [type, setType] = useState<SupportType | ''>('')
  const [site, setSite] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<SupportResult | null>(null)

  const isSite = type === 'job_site'
  const host = isSite ? siteHost(site) : null
  const canSend = type !== '' && (isSite ? host !== null : message.trim() !== '')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSend || sending) return
    setSending(true)
    setResult(null)
    setResult(await sendSupport({ type: type as SupportType, message: message.trim(), ...(host && { site: host }) }))
    setSending(false)
  }

  if (result === 'sent') {
    return (
      // Focused on mount: the form, and the Send button that had focus, are gone.
      <p ref={(el) => el?.focus()} tabIndex={-1} className="text-[15px] text-ink outline-none">
        Thanks. We&apos;ll reply to {email} within one business day.
      </p>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="support-type">Type</Label>
        <Select value={type} onValueChange={(v) => setType(v as SupportType)} required>
          <SelectTrigger id="support-type" className="h-11 rounded-full bg-surface px-4">
            <SelectValue placeholder="Choose one" />
          </SelectTrigger>
          <SelectContent>
            {TYPES.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isSite && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="support-site">Job site address</Label>
          <Input
            id="support-site"
            value={site}
            onChange={(e) => setSite(e.target.value)}
            placeholder="jobs.example.com"
            inputMode="url"
            autoComplete="off"
            required
            aria-invalid={site.trim() !== '' && host === null}
            aria-describedby={site.trim() !== '' && host === null ? 'support-site-hint' : undefined}
            className="h-11 rounded-full bg-surface px-4"
          />
          {site.trim() !== '' && host === null && (
            <p id="support-site-hint" className="text-[12px] text-ink-2">Paste the job page&apos;s address, or type the site, like example.com.</p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="support-message">Message{isSite && <span className="font-normal text-subtle"> (optional)</span>}</Label>
        <Textarea
          id="support-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={MAX_MESSAGE}
          rows={6}
          required={!isSite}
          className="rounded-[20px] bg-surface px-4 py-3"
        />
      </div>

      {result && <p role="alert" className="text-[13px] leading-snug text-destructive">{ERRORS[result]}</p>}

      <Button type="submit" className="self-start rounded-full px-5" disabled={!canSend || sending}>
        {sending ? <><Spinner className="size-3.5" />Sending</> : 'Send'}
      </Button>
    </form>
  )
}
