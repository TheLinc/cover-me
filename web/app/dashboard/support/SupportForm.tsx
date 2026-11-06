'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import {
  ArrowLeftIcon,
  BrowserIcon,
  BugIcon,
  ChatCircleDotsIcon,
  CheckIcon,
  CreditCardIcon,
  IdentificationCardIcon,
  LightbulbIcon,
  PaperPlaneTiltIcon,
  SealCheckIcon,
  StarIcon,
  WarningCircleIcon,
  type Icon,
} from '@phosphor-icons/react'
import { sendSupport, siteHost, type SupportResult, type SupportType } from '@/lib/support'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup } from '@/components/ui/radio-group'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const TOPICS: Array<{ value: SupportType; label: string; hint: string; icon: Icon; prompt: string }> = [
  { value: 'problem', label: "Something isn't working", hint: "A bug, an error, or a page that won't load", icon: BugIcon, prompt: 'What happened, and what did you expect? The job site or page helps.' },
  { value: 'feature', label: 'Feature request', hint: "Something you'd like Cover Me to do", icon: LightbulbIcon, prompt: 'What would you like Cover Me to do?' },
  { value: 'account', label: 'Account or billing', hint: 'Your plan, a payment, or signing in', icon: CreditCardIcon, prompt: 'What do you need help with?' },
  { value: 'job_site', label: 'Request a job site', hint: "A site the extension can't read yet", icon: BrowserIcon, prompt: 'Anything we should know about this site? (optional)' },
  { value: 'other', label: 'Something else', hint: "Anything we haven't listed", icon: ChatCircleDotsIcon, prompt: "What's on your mind?" },
]
const MAX_MESSAGE = 1000
const ERRORS: Record<Exclude<SupportResult, 'sent'>, string> = {
  limited: "You've sent a few messages already today. If it can't wait, email support@cover-me.dev.",
  failed: "Couldn't send that. Please try again, or email support@cover-me.dev.",
}
const TILE_SHADOW = 'shadow-[0_1px_2px_rgba(30,27,75,0.05),0_10px_28px_-16px_rgba(30,27,75,0.22)]'

type Plan = 'Free' | 'Pro' | 'Trial'

// The form on the left, and on the right the email we'll get, written out as
// it's typed: who it's to, the reply address, the subject the server builds
// and what's attached. Sending stamps that letter and the form gives way.
export function SupportForm({ email, plan }: { email: string; plan: Plan }) {
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
  const sent = result === 'sent'

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

  const letter = (
    <Letter email={email} plan={plan} subject={topic?.label} site={host} message={message.trim()} siteRequest={isSite} stamped={sent} />
  )

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-[34px] font-semibold leading-tight tracking-[-0.03em] text-ink">Support</h1>
        <p className="text-[14px] text-ink-2">Write to us here. It goes straight to our inbox with your account attached, so we can reply.</p>
      </header>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12">
        {sent ? (
          // Focused on mount: the form, and the Send button that had focus, are gone.
          <section
            ref={(el) => el?.focus()}
            tabIndex={-1}
            aria-labelledby="support-sent-title"
            aria-describedby="support-sent-text"
            className="flex flex-col items-start gap-5 outline-none motion-safe:duration-500 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 lg:pt-6"
          >
            <span aria-hidden className="flex size-14 items-center justify-center rounded-[16px] bg-brand-tint text-brand-ink">
              <SealCheckIcon size={30} weight="duotone" />
            </span>
            <div className="flex flex-col gap-2">
              <h2 id="support-sent-title" className="text-[28px] font-semibold leading-tight tracking-[-0.025em] text-ink">Message sent</h2>
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
          <form onSubmit={submit} className="flex min-w-0 flex-col gap-7">
            <fieldset className="flex flex-col gap-3">
              <legend id="support-topic" className="mb-3 text-[20px] font-semibold tracking-[-0.02em] text-ink">What&apos;s this about?</legend>
              <RadioGroup
                value={type}
                onValueChange={(v) => setType(v as SupportType)}
                aria-labelledby="support-topic"
                required
                className="grid grid-cols-2 gap-2.5"
              >
                {TOPICS.map(({ value, label, hint, icon: TopicIcon }, i) => (
                  <RadioGroupPrimitive.Item
                    key={value}
                    value={value}
                    className={cn(
                      'group relative flex items-center gap-3 rounded-[20px] border border-line bg-surface p-3 pr-4 text-left transition-[border-color,background-color,box-shadow] duration-200',
                      'hover:border-[rgba(90,83,77,0.35)] hover:shadow-[0_1px_2px_rgba(30,27,75,0.05),0_8px_20px_-14px_rgba(30,27,75,0.3)]',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
                      'data-[state=checked]:border-[rgba(99,102,241,0.4)] data-[state=checked]:bg-brand-tint data-[state=checked]:shadow-none',
                      i === TOPICS.length - 1 && 'col-span-2',
                    )}
                  >
                    <span aria-hidden className="relative flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-brand-tint text-brand-ink transition-colors group-data-[state=checked]:bg-surface">
                      <TopicIcon size={20} weight="duotone" />
                      <span className="absolute -bottom-1 -right-1 flex size-[18px] scale-50 items-center justify-center rounded-full border-2 border-brand-tint bg-brand-strong text-white opacity-0 transition-[opacity,transform] duration-200 group-data-[state=checked]:scale-100 group-data-[state=checked]:opacity-100">
                        <CheckIcon size={10} weight="bold" />
                      </span>
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-[14px] font-semibold leading-snug tracking-[-0.01em] text-ink group-data-[state=checked]:text-brand-ink">{label}</span>
                      <span className="text-[12.5px] leading-snug text-subtle max-sm:hidden">{hint}</span>
                    </span>
                  </RadioGroupPrimitive.Item>
                ))}
              </RadioGroup>
            </fieldset>

            <div className={cn('flex flex-col rounded-[20px] border border-line bg-surface transition-[border-color,box-shadow] focus-within:border-[rgba(99,102,241,0.4)]', TILE_SHADOW)}>
              {isSite && (
                <div className="flex flex-col gap-2 border-b border-line p-5 pb-4 motion-safe:duration-300 motion-safe:animate-in motion-safe:fade-in">
                  <Label htmlFor="support-site" className="text-[12.5px] font-normal normal-case tracking-normal text-subtle">Job site address</Label>
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
                placeholder={topic?.prompt ?? 'Pick a topic above, then write here.'}
                className="min-h-[180px] resize-none border-0 bg-transparent px-5 py-4 text-[15px] leading-[1.65] md:text-[15px] text-body shadow-none placeholder:text-subtle focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
                <span className="text-[12.5px] tabular-nums text-subtle" aria-live="off">
                  {message.length.toLocaleString('en-US')} / 1,000
                </span>
                <Button type="submit" className="rounded-full px-5" disabled={!canSend || sending}>
                  {sending ? <><Spinner className="size-3.5" />Sending</> : <>Send <PaperPlaneTiltIcon size={15} weight="fill" aria-hidden /></>}
                </Button>
              </div>
            </div>

            {result && (
              <p role="alert" className="-mt-3 flex items-start gap-2 text-[13px] leading-snug text-destructive">
                <WarningCircleIcon size={17} aria-hidden className="mt-px shrink-0" />{ERRORS[result]}
              </p>
            )}

            <p className="-mt-3 flex items-center gap-2 text-[12.5px] text-subtle lg:hidden">
              <IdentificationCardIcon size={16} aria-hidden className="shrink-0" />
              Sent with your email, account ID and plan, so we can reply.
            </p>
          </form>
        )}

        <aside aria-label={sent ? 'The message you sent' : 'Preview of your message'} className={cn(!sent && 'max-lg:hidden')}>
          <div className="lg:sticky lg:top-24">{letter}</div>
        </aside>
      </div>
    </div>
  )
}

// The email as our inbox will see it.
function Letter({ email, plan, subject, site, message, siteRequest, stamped }: {
  email: string
  plan: Plan
  subject?: string
  site: string | null
  message: string
  siteRequest: boolean
  stamped: boolean
}) {
  const long = message.length > 420 || message.split('\n').length > 9
  return (
    <div className={cn('relative pb-2 pr-2', stamped && 'motion-safe:duration-500 motion-safe:animate-in motion-safe:zoom-in-95')}>
      {/* The sheet underneath */}
      <div aria-hidden className="absolute inset-0 left-2 top-2 rotate-[2deg] rounded-[20px] border border-line bg-panel" />
      <div className={cn('relative flex flex-col rounded-[20px] border border-line bg-surface p-6', TILE_SHADOW)}>
        {/* A postage stamp, with the Cover Me mark */}
        <div aria-hidden className="absolute right-5 top-5 flex size-12 rotate-[4deg] items-center justify-center rounded-[10px] border-[1.5px] border-dashed border-[rgba(90,83,77,0.3)] bg-paper">
          <Image src="/logo.png" width={24} height={24} alt="" className="rounded-[6px]" />
        </div>
        {stamped && (
          <div
            aria-hidden
            className="absolute -bottom-3 right-6 flex -rotate-[7deg] items-center gap-1.5 rounded-full border-2 border-brand-strong bg-surface/90 px-3 py-1 text-[13px] font-semibold text-brand-strong motion-safe:delay-300 motion-safe:duration-300 motion-safe:fill-mode-backwards motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-150"
          >
            <SealCheckIcon size={15} weight="fill" />Sent
          </div>
        )}

        <dl className="grid grid-cols-[68px_minmax(0,1fr)] gap-y-1.5 pr-16 text-[12.5px]">
          <dt className="text-subtle">To</dt>
          <dd className="truncate text-ink-2">support@cover-me.dev</dd>
          <dt className="text-subtle">Reply-to</dt>
          <dd className="truncate text-ink-2">{email}</dd>
        </dl>

        <p className={cn('mt-5 text-[15px] leading-snug tracking-[-0.01em]', subject ? 'font-semibold text-ink' : 'text-subtle')}>
          {subject ? `[${subject}] from a ${plan} account` : 'Pick a topic for the subject line'}
        </p>

        <div aria-hidden className="my-4 h-px bg-line" />

        {site && (
          <p className="mb-3 inline-flex w-fit max-w-full items-center gap-1.5 rounded-full bg-brand-tint px-2.5 py-1 text-[12.5px] font-medium text-brand-ink">
            <BrowserIcon size={14} aria-hidden className="shrink-0" /><span className="truncate">{site}</span>
          </p>
        )}

        <p
          className={cn(
            'max-h-[230px] overflow-hidden whitespace-pre-wrap break-words text-[13.5px] leading-[1.65]',
            message ? 'text-body' : 'text-subtle',
            long && '[mask-image:linear-gradient(to_bottom,black_70%,transparent)]',
          )}
        >
          {message || (siteRequest ? '(no message)' : 'Your message shows up here as you write it.')}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-1.5 text-[12px]">
          <span className="text-subtle">Attached</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-panel px-2.5 py-1 font-medium text-ink-2">
            <IdentificationCardIcon size={13} aria-hidden />Account ID
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-panel px-2.5 py-1 font-medium text-ink-2">
            {plan === 'Pro' && <StarIcon size={12} weight="fill" aria-hidden />}{plan === 'Trial' ? 'Pro trial' : `${plan} plan`}
          </span>
        </div>
      </div>
    </div>
  )
}
