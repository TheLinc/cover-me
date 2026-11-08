'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeftIcon,
  BrowserIcon,
  BugIcon,
  ChatCircleDotsIcon,
  CreditCardIcon,
  IdentificationCardIcon,
  LightbulbIcon,
  PaperPlaneTiltIcon,
  SealCheckIcon,
  WarningCircleIcon,
  type Icon,
} from '@phosphor-icons/react'
import { sendSupport, siteHost, type SupportResult, type SupportType } from '@/lib/support'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const TOPICS: Array<{ value: SupportType; label: string; icon: Icon; prompt: string }> = [
  { value: 'problem', label: "Something isn't working", icon: BugIcon, prompt: 'What happened, and what did you expect? The job site or page helps.' },
  { value: 'feature', label: 'Feature request', icon: LightbulbIcon, prompt: 'What would you like Cover Me to do?' },
  { value: 'account', label: 'Account or billing', icon: CreditCardIcon, prompt: 'What do you need help with?' },
  { value: 'job_site', label: 'Request a job site', icon: BrowserIcon, prompt: 'Anything we should know about this site? (optional)' },
  { value: 'other', label: 'Something else', icon: ChatCircleDotsIcon, prompt: "What's on your mind?" },
]
const MAX_MESSAGE = 1000
const ERRORS: Record<Exclude<SupportResult, 'sent'>, string> = {
  limited: "You've sent a few messages already today. If it can't wait, email support@cover-me.dev.",
  failed: "Couldn't send that. Please try again, or email support@cover-me.dev.",
}
const TILE = 'rounded-[20px] border border-line bg-surface shadow-[0_1px_2px_rgba(30,27,75,0.05),0_10px_28px_-16px_rgba(30,27,75,0.22)]'
const LABEL = 'text-[12.5px] font-normal normal-case tracking-normal text-subtle'

export function SupportForm({ email }: { email: string }) {
  const [type, setType] = useState<SupportType | ''>('')
  const [site, setSite] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<SupportResult | null>(null)

  const topic = TOPICS.find((t) => t.value === type)
  const isSite = type === 'job_site'
  const host = isSite ? siteHost(site) : null
  const siteInvalid = isSite && site.trim() !== '' && host === null
  const canSend = type !== '' && (isSite ? host !== null : message.trim() !== '')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSend || sending) return
    setSending(true)
    setResult(null)
    setResult(await sendSupport({ type: type as SupportType, message: message.trim(), ...(host && { site: host }) }))
    setSending(false)
  }

  function startOver() {
    setType('')
    setSite('')
    setMessage('')
    setResult(null)
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-[34px] font-semibold leading-tight tracking-[-0.03em] text-ink">Support</h1>
        <p className="text-[14px] text-ink-2">Write to us here. It goes straight to our inbox with your account attached, so we can reply.</p>
      </header>

      {result === 'sent' ? (
        // Focused on mount: the form, and the Send button that had focus, are gone.
        <section
          ref={(el) => el?.focus()}
          tabIndex={-1}
          aria-labelledby="support-sent-title"
          aria-describedby="support-sent-text"
          className={cn(TILE, 'flex flex-col items-start gap-5 p-7 outline-none motion-safe:duration-500 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2')}
        >
          <span aria-hidden className="flex size-14 items-center justify-center rounded-[16px] bg-brand-tint text-brand-ink motion-safe:delay-150 motion-safe:duration-500 motion-safe:fill-mode-backwards motion-safe:animate-in motion-safe:zoom-in-50">
            <SealCheckIcon size={30} weight="duotone" />
          </span>
          <div className="flex flex-col gap-2">
            <h2 id="support-sent-title" className="text-[26px] font-semibold leading-tight tracking-[-0.025em] text-ink">Message sent</h2>
            <p id="support-sent-text" className="max-w-[46ch] text-[15px] leading-relaxed text-ink-2">
              Thanks. We&apos;ll reply to <strong className="font-medium text-ink">{email}</strong> within one business day.
            </p>
          </div>
          <div className="mt-1 flex flex-wrap gap-2">
            <Button asChild variant="outline" className="rounded-full px-4">
              <Link href="/dashboard"><ArrowLeftIcon size={14} aria-hidden />Back to dashboard</Link>
            </Button>
            <Button variant="ghost" className="rounded-full px-4" onClick={startOver}>Send another</Button>
          </div>
        </section>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="support-type" className={LABEL}>What&apos;s this about?</Label>
            <Select value={type} onValueChange={(v) => setType(v as SupportType)} required>
              <SelectTrigger id="support-type" className="h-12 rounded-full border-line bg-surface px-5 text-[15px] shadow-[0_1px_2px_rgba(30,27,75,0.05)] focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-paper [&>span]:flex [&>span]:items-center [&>span]:gap-2.5">
                <SelectValue placeholder="Choose a topic" />
              </SelectTrigger>
              <SelectContent className="rounded-[16px] border-line bg-surface p-1 shadow-[0_1px_2px_rgba(30,27,75,0.06),0_16px_36px_-18px_rgba(30,27,75,0.35)]">
                {TOPICS.map(({ value, label, icon: TopicIcon }) => (
                  <SelectItem key={value} value={value} className="rounded-[10px] py-2.5 text-[14px] text-ink focus:bg-panel focus:text-ink">
                    <span className="flex items-center gap-2.5">
                      <TopicIcon size={18} weight="duotone" aria-hidden className="text-brand-ink" />
                      {label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={cn(TILE, 'flex flex-col transition-[border-color] focus-within:border-[rgba(99,102,241,0.4)]')}>
            {isSite && (
              <div className="flex flex-col gap-2 border-b border-line p-5 pb-4 motion-safe:duration-300 motion-safe:animate-in motion-safe:fade-in">
                <Label htmlFor="support-site" className={LABEL}>Job site address</Label>
                <Input
                  id="support-site"
                  value={site}
                  onChange={(e) => setSite(e.target.value)}
                  placeholder="Paste the job page, or type the site"
                  inputMode="url"
                  autoComplete="off"
                  required
                  aria-invalid={siteInvalid}
                  aria-describedby="support-site-hint"
                  className="h-11 rounded-full bg-paper px-4"
                />
                <p id="support-site-hint" className={cn('text-[12.5px]', siteInvalid ? 'text-destructive' : 'text-subtle')}>
                  {siteInvalid ? "That doesn't look like a site address. Try something like example.com." : host ? <>We&apos;ll look at <strong className="font-medium text-ink-2">{host}</strong>.</> : "A full link works. We only keep the site's name."}
                </p>
              </div>
            )}
            <Label htmlFor="support-message" className="sr-only">Message{isSite && ' (optional)'}</Label>
            <Textarea
              id="support-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={MAX_MESSAGE}
              rows={7}
              required={!isSite}
              placeholder={topic?.prompt ?? 'Choose a topic, then write here.'}
              className="min-h-[180px] resize-none border-0 bg-transparent px-5 py-4 text-[15px] leading-[1.65] text-body shadow-none placeholder:text-subtle focus-visible:ring-0 focus-visible:ring-offset-0 md:text-[15px]"
            />
            <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
              <span className="text-[12.5px] tabular-nums text-subtle">{message.length.toLocaleString('en-US')} / 1,000</span>
              <Button type="submit" className="rounded-full px-5" disabled={!canSend || sending}>
                {sending ? <><Spinner className="size-3.5" />Sending</> : <>Send <PaperPlaneTiltIcon size={15} weight="fill" aria-hidden /></>}
              </Button>
            </div>
          </div>

          {result && (
            <p role="alert" className="flex items-start gap-2 text-[13px] leading-snug text-destructive">
              <WarningCircleIcon size={17} aria-hidden className="mt-px shrink-0" />{ERRORS[result]}
            </p>
          )}

          <p className="flex items-center gap-2 text-[12.5px] text-subtle">
            <IdentificationCardIcon size={16} aria-hidden className="shrink-0" />
            Sent with your email, account ID and plan, so we can reply.
          </p>
        </form>
      )}
    </div>
  )
}
