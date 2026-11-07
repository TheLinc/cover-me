import { useEffect, useRef, useState } from 'react'
import { SUPABASE_URL, WEB_URL } from '../../lib/config'
import { rememberRequestedSite, requestedSites, sendSiteRequest } from '../../lib/site-request'
import type { ScrapeFailure } from '../../types'

// A click that read no job (#130), saved with the tab's Generate page state.
// flow: which button was pressed. tabId, tabUrl: the tab it's about and the
// page that tab was on (kept in this browser only). reported: the bug report
// went through.
export type ShownFailure = ScrapeFailure & { flow: 'letter' | 'tailor'; tabId?: number; tabUrl?: string; reported?: boolean }

interface Props {
  failure: ShownFailure
  onReported: () => void
  // Shown while the paste form is closed.
  onPaste?: () => void
  onRetry?: () => void
}

// What sits above (or instead of) the paste form after a failed read: a site
// we don't read yet can be requested, a supported board's failure reported.
// Builds without a backend have nothing to send to, so they get neither.
export default function ScrapeFailurePanel({ failure, onReported, onPaste, onRetry }: Props) {
  const actions = (onPaste || onRetry) && (
    <div className="scrape-failure-actions">
      {onPaste && <button className="btn btn-secondary btn-sm" onClick={onPaste}>Paste it manually</button>}
      {onRetry && <button className="btn btn-ghost btn-sm" onClick={onRetry}>Try again</button>}
    </div>
  )

  if (failure.reason === 'not_web') {
    return (
      <section className="scrape-failure">
        <p>Open a job posting, then try again.</p>
        {actions}
      </section>
    )
  }

  if (failure.reason === 'failed') {
    return (
      <section className="scrape-failure">
        <div className="error-box">{failure.error}</div>
        {SUPABASE_URL && failure.url && <BugReport failure={failure} onReported={onReported} />}
        {actions}
      </section>
    )
  }

  // A card like the popup's other notices, so it reads apart from the paste form below.
  return (
    <section className="page-read-notice scrape-failure-card" aria-labelledby="scrape-failure-title">
      <div className="news-heading">
        <span className="news-icon" aria-hidden="true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20" />
            <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
          </svg>
        </span>
        <p id="scrape-failure-title" className="page-read-notice-title">We can&apos;t read {failure.host} yet.</p>
      </div>
      <p>
        Paste the job description below and you&apos;ll still get your{' '}
        {failure.flow === 'letter' ? 'letter' : 'tailored resume'}.
      </p>
      {SUPABASE_URL && <SiteRequestRow host={failure.host} />}
    </section>
  )
}

function SiteRequestRow({ host }: { host: string }) {
  const [value, setValue] = useState(host)
  const [noted, setNoted] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const thanks = useRef<HTMLParagraphElement>(null)
  const submitted = useRef(false)

  // After a send, the form is gone: keep focus on the line that replaced it,
  // which also reads it out.
  useEffect(() => { if (noted && submitted.current) thanks.current?.focus() }, [noted])

  useEffect(() => {
    void requestedSites().then((sites) => { if (sites.includes(host)) setNoted(host) })
  }, [host])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    // A pasted address works too: keep just the hostname.
    const site = value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0]
    setSending(true)
    setError('')
    try {
      await sendSiteRequest({ kind: 'site', host: site })
      await rememberRequestedSite(site)
      submitted.current = true
      setNoted(site)
    } catch (err) {
      setError((err as { status?: number }).status === 400
        ? "That doesn't look like a site address, like jobs.example.com."
        : "Couldn't send that. Try again in a moment.")
    } finally {
      setSending(false)
    }
  }

  if (noted) {
    return (
      <p className="scrape-failure-thanks" ref={thanks} tabIndex={-1}>
        Thanks, we&apos;ve noted {noted}.{' '}
        <a className="text-link" href={`${WEB_URL}/roadmap?utm_source=extension`} target="_blank" rel="noreferrer">See what&apos;s coming →</a>
      </p>
    )
  }
  return (
    <form className="site-request" onSubmit={submit}>
      <div className="site-request-row">
        <input className="form-input" aria-label="Job site" value={value} onChange={(e) => setValue(e.target.value)} />
        <button className="btn btn-secondary btn-sm" type="submit" disabled={sending || !value.trim()}>Request this site</button>
      </div>
      {error && <p className="scrape-failure-error" role="alert">{error}</p>}
    </form>
  )
}

function BugReport({ failure, onReported }: { failure: ShownFailure; onReported: () => void }) {
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  async function report() {
    setSending(true)
    setError('')
    try {
      await sendSiteRequest({
        kind: 'bug',
        url: failure.url!,
        scraper: failure.scraper ?? 'generic',
        error: failure.error.slice(0, 300),
        version: chrome.runtime.getManifest().version,
      })
      onReported()
    } catch {
      setError("Couldn't send the report. Try again in a moment.")
    } finally {
      setSending(false)
    }
  }

  return (
    // Live, so the button's change to "Reported" is read out.
    <div className="bug-report" aria-live="polite">
      <button className="btn btn-secondary btn-sm" onClick={report} disabled={sending || failure.reported}>
        {failure.reported ? "Reported. Thanks, we're on it." : 'Report bug'}
      </button>
      {!failure.reported && <p className="hint bug-report-url">Sends this address: {failure.url}</p>}
      {error && <p className="scrape-failure-error">{error}</p>}
    </div>
  )
}
