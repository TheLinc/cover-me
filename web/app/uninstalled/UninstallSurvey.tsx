'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { whenPosthogLoaded } from '@/lib/analytics'
import { CHROME_STORE_URL } from '@/lib/utils'

// PostHog survey "Why did you remove Cover Me?" (API mode). Its results page
// reads these events; the ids come from the survey in PostHog.
const SURVEY_ID = 'TODO-create-survey-in-posthog'
const REASON_QUESTION_ID = 'TODO-reason-question-id'
const COMMENT_QUESTION_ID = 'TODO-comment-question-id'

const OTHER = 'Other'
const REASONS = [
  "It didn't work on the job sites I use",
  "The resumes or cover letters weren't good enough",
  'Too expensive / hit the free limit',
  'Setting it up was too much work (account, resume, API key)',
  'I found a job or stopped looking',
  'Privacy concerns',
  OTHER,
]

const SUPPORT_EMAIL = 'support@cover-me.dev'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const VERSION = /^\d+(\.\d+){0,3}$/

// Opened by Chrome when someone removes the extension (extension/src/background/install.ts).
// u is the account id, there only when they were signed in. Both come from the
// URL, so anything that isn't a UUID or a version number is dropped.
export function UninstallSurvey() {
  const params = useSearchParams()
  const [reason, setReason] = useState('')
  const [comment, setComment] = useState('')
  const [sent, setSent] = useState(false)

  useEffect(() => whenPosthogLoaded(posthog, () => { posthog.capture('survey shown', { $survey_id: SURVEY_ID }) }), [])

  const needsComment = reason === OTHER
  const canSend = reason !== '' && (!needsComment || comment.trim() !== '')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSend) return
    const accountId = params.get('u') ?? ''
    const version = params.get('v') ?? ''
    const answer = {
      $survey_id: SURVEY_ID,
      [`$survey_response_${REASON_QUESTION_ID}`]: reason,
      ...(comment.trim() && { [`$survey_response_${COMMENT_QUESTION_ID}`]: comment.trim() }),
      ...(UUID.test(accountId) && { account_id: accountId }),
      ...(VERSION.test(version) && { extension_version: version }),
    }
    whenPosthogLoaded(posthog, () => { posthog.capture('survey sent', answer) })
    setSent(true)
  }

  if (sent) {
    return (
      <div role="status" className="text-center">
        <h1 className="text-[34px] font-semibold leading-tight tracking-[-0.03em]">Thanks for telling us</h1>
        <p className="mt-6">
          <a href={CHROME_STORE_URL} className="text-brand-strong underline-offset-4 hover:underline">
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
