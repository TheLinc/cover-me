'use client'

import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { whenPosthogLoaded } from '@/lib/analytics'
import { CHROME_STORE_URL } from '@/lib/utils'

// PostHog survey "Why did you remove Cover Me?" (API mode). Its results page
// reads these events; the ids come from the survey in PostHog:
// https://us.posthog.com/project/668786/surveys/01a1a968-9657-0000-8c01-c3d4a0dca3ff
// Its choices must match REASONS. Changing a question's text there keeps its id.
const SURVEY_ID = '01a1a968-9657-0000-8c01-c3d4a0dca3ff'
const REASON_QUESTION_ID = '57561f2e-d353-4321-91f9-ca247419d4a9'
const COMMENT_QUESTION_ID = '5318a93b-ea8f-47ed-a8bb-5d70cc624d2a'
const PRICE_QUESTION_ID = '02b8d49f-d0ff-4ba3-b639-4d2d3ab9101f'
const PRIVACY_QUESTION_ID = 'ed363ac7-1306-4e03-be2b-7337ae04f2f4'

const OTHER = 'Other' as const
const REASONS = [
  "It didn't work on the job sites I use",
  "The resumes or cover letters weren't good enough",
  'Too expensive',
  'I hit the free limit',
  'Setting it up was too much work (account, resume, API key)',
  'I found a job or stopped looking',
  'Privacy concerns',
  OTHER,
] as const
type Reason = (typeof REASONS)[number]

const SUPPORT_EMAIL = 'support@cover-me.dev'
const LINK_CLASS = 'text-brand-strong underline-offset-4 hover:underline'

const FREE_LIMIT = "A free account gets 5 generations a week, and with your own Claude or OpenAI key there's no limit from us."

// Arrow markers, as on /privacy: the brand avoids round bullets
function Fact({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span aria-hidden="true" className="shrink-0 text-brand">→</span>
      <span>{children}</span>
    </li>
  )
}

// The line under "Thanks for telling us", by reason. Reasons not here get none.
// Every privacy line must match a sentence on /privacy.
const REPLIES: Partial<Record<Reason, ReactNode>> = {
  "It didn't work on the job sites I use": (
    <p>
      Which site was it? If your comment didn&apos;t say, email{' '}
      <a href={`mailto:${SUPPORT_EMAIL}`} className={LINK_CLASS}>{SUPPORT_EMAIL}</a>. We can usually fix a site
      without an extension update. <a href="/roadmap" className={LINK_CLASS}>See what we&apos;re working on</a>.
    </p>
  ),
  'I hit the free limit': <p>{FREE_LIMIT}</p>,
  'Too expensive': <p>{FREE_LIMIT}</p>,
  'Privacy concerns': (
    <ul className="mx-auto max-w-md space-y-2 text-left">
      <Fact>With your own API key, no account is needed. Your resume and letters stay in your browser, and your resume goes only to the AI provider whose key you use.</Fact>
      <Fact>With an account, your resume is encrypted on our server, and we never use it to train AI.</Fact>
      <Fact>The extension reads a page only when you click, and sends us a copy only if you agree.</Fact>
      <Fact>
        Cover Me is open source, so anyone can check this: read the{' '}
        <a href="/privacy" className={LINK_CLASS}>privacy policy</a> or the{' '}
        <a href="https://github.com/TheLinc/cover-me" className={LINK_CLASS}>code on GitHub</a>.
      </Fact>
    </ul>
  ),
  'I found a job or stopped looking': <p>Congratulations.</p>,
}

type FollowUpQuestion = { id: string; question: string; choices: string[] }

// One optional question on the thank-you screen, for the reasons that leave us guessing.
// Its choices must match the question's in the PostHog survey.
const FOLLOW_UPS: Partial<Record<Reason, FollowUpQuestion>> = {
  'Too expensive': {
    id: PRICE_QUESTION_ID,
    question: 'What would have worked for you?',
    choices: ['A lower monthly price', 'Paying for just a week or two while I apply', 'A one-time payment', 'Only a free version'],
  },
  'Privacy concerns': {
    id: PRIVACY_QUESTION_ID,
    question: 'What worried you most?',
    choices: ['Uploading my resume', 'Creating an account', 'Sending data to an AI company', 'The extension reading web pages'],
  },
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const VERSION = /^\d+(\.\d+){0,3}$/

// When this browser last sent an answer. For a day after, the page shows the
// thank-you screen instead of the form, so a refresh, a new tab or a second
// uninstall doesn't send the same person's answer twice. Disclosed on /privacy.
const SENT_AT_KEY = 'uninstall-survey-sent-at'
const ANSWER_ONCE_MS = 24 * 60 * 60 * 1000

// localStorage throws when the browser blocks storage; the form then just shows
function answeredRecently(): boolean {
  try {
    return Date.now() - Number(localStorage.getItem(SENT_AT_KEY)) < ANSWER_ONCE_MS
  } catch {
    return false
  }
}

const noSubscribe = () => () => {}

function rememberAnswered() {
  try {
    localStorage.setItem(SENT_AT_KEY, String(Date.now()))
  } catch {}
}

// Opened by Chrome when someone removes the extension (extension/src/background/install.ts).
// u is the account id, there only when they were signed in. Both come from the
// URL, so anything that isn't a UUID or a version number is dropped.
export function UninstallSurvey() {
  const params = useSearchParams()
  const [reason, setReason] = useState('')
  const [comment, setComment] = useState('')
  // The answer as sent, kept so a follow-up can re-send it under the same submission id
  const [sent, setSent] = useState<Record<string, unknown> | null>(null)
  // False on the server, then the browser's value, without a hydration mismatch
  const answeredBefore = useSyncExternalStore(noSubscribe, answeredRecently, () => false)

  useEffect(() => {
    if (answeredRecently()) return
    return whenPosthogLoaded(posthog, () => { posthog.capture('survey shown', { $survey_id: SURVEY_ID }) })
  }, [])

  const needsComment = reason === OTHER
  const canSend = reason !== '' && (!needsComment || comment.trim() !== '')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSend) return
    const accountId = params.get('u') ?? ''
    const version = params.get('v') ?? ''
    const answer = {
      $survey_id: SURVEY_ID,
      // A follow-up re-sends this with the same id, and PostHog keeps one response per id
      $survey_submission_id: crypto.randomUUID(),
      $survey_completed: true,
      [`$survey_response_${REASON_QUESTION_ID}`]: reason,
      ...(comment.trim() && { [`$survey_response_${COMMENT_QUESTION_ID}`]: comment.trim() }),
      ...(UUID.test(accountId) && { account_id: accountId }),
      ...(VERSION.test(version) && { extension_version: version }),
    }
    whenPosthogLoaded(posthog, () => { posthog.capture('survey sent', answer) })
    rememberAnswered()
    setSent(answer)
  }

  if (sent) {
    // Sent only with a reason picked from REASONS
    const reply = REPLIES[reason as Reason]
    const followUp = FOLLOW_UPS[reason as Reason]
    return (
      <div className="text-center">
        {/* Focused on mount: the form, and the Send button that had focus, are gone */}
        <h1 ref={(el) => el?.focus()} tabIndex={-1} className="text-[34px] font-semibold leading-tight tracking-[-0.03em] outline-none">Thanks for telling us</h1>
        {reply && <div className="mt-4 text-[15px] text-muted-foreground">{reply}</div>}
        {followUp && <FollowUp {...followUp} answer={sent} />}
        <p className="mt-6">
          <a href={CHROME_STORE_URL} className={LINK_CLASS}>
            Changed your mind? Reinstall
          </a>
        </p>
      </div>
    )
  }

  // After the sent screen: sending sets the flag this reads
  if (answeredBefore) {
    return (
      <div className="text-center">
        <h1 className="text-[34px] font-semibold leading-tight tracking-[-0.03em]">Thanks for telling us</h1>
        <p className="mt-4 text-[15px] text-muted-foreground">We already have your answer.</p>
        <p className="mt-6">
          <a href={CHROME_STORE_URL} className={LINK_CLASS}>
            Changed your mind? Reinstall
          </a>
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit}>
      <h1 id="reason-label" className="text-[34px] font-semibold leading-tight tracking-[-0.03em]">
        Why did you remove Cover Me?
      </h1>
      <p className="mt-3 text-[15px] text-muted-foreground">
        Let us know what we can do better. All feedback is appreciated.
      </p>
      <RadioGroup aria-labelledby="reason-label" value={reason} onValueChange={setReason} required className="mt-6 gap-3">
        {REASONS.map((r, i) => (
          <div key={r} className="flex items-center gap-3">
            <RadioGroupItem value={r} id={`reason-${i}`} />
            <Label htmlFor={`reason-${i}`} className="normal-case tracking-normal text-[15px] text-foreground font-normal cursor-pointer">{r}</Label>
          </div>
        ))}
      </RadioGroup>

      <Label htmlFor="comment" className="block mt-8 normal-case tracking-normal text-[15px] text-foreground font-medium">
        Anything else you want to tell us?{' '}
        <span className="font-normal text-muted-foreground">{needsComment ? '(required for Other)' : '(optional)'}</span>
      </Label>
      <Textarea
        id="comment"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={1000}
        required={needsComment}
        rows={4}
        className="mt-2"
      />

      <Button type="submit" size="lg" disabled={!canSend} className="mt-6">Send</Button>

      <p className="mt-8 text-sm text-muted-foreground">
        Want a reply? Email{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand-strong hover:underline">{SUPPORT_EMAIL}</a>.
      </p>
    </form>
  )
}

function FollowUp({ id, question, choices, answer }: FollowUpQuestion & { answer: Record<string, unknown> }) {
  const [choice, setChoice] = useState('')
  const [done, setDone] = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!choice) return
    whenPosthogLoaded(posthog, () => { posthog.capture('survey sent', { ...answer, [`$survey_response_${id}`]: choice }) })
    setDone(true)
  }

  if (done) {
    // Focused on mount: the Send button that had focus is gone
    return <p ref={(el) => el?.focus()} tabIndex={-1} className="mt-8 text-[15px] outline-none">Thanks, that helps.</p>
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-8 max-w-md text-left">
      <p id={`follow-up-${id}`} className="text-[15px] font-medium">
        {question} <span className="font-normal text-muted-foreground">(optional)</span>
      </p>
      <RadioGroup aria-labelledby={`follow-up-${id}`} value={choice} onValueChange={setChoice} className="mt-3 gap-3">
        {choices.map((c, i) => (
          <div key={c} className="flex items-center gap-3">
            <RadioGroupItem value={c} id={`follow-up-${i}`} />
            <Label htmlFor={`follow-up-${i}`} className="normal-case tracking-normal text-[15px] text-foreground font-normal cursor-pointer">{c}</Label>
          </div>
        ))}
      </RadioGroup>
      <Button type="submit" disabled={!choice} className="mt-4">Send</Button>
    </form>
  )
}
