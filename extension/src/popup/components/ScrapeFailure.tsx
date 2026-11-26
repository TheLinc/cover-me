import { useEffect, useRef, useState } from 'react'
import { ensureValidSession } from '../../lib/auth'
import { getMode } from '../../lib/storage'
import { SUPABASE_URL, WEB_URL } from '../../lib/config'
import { rememberRequestedSite, requestedSites, sendSiteRequest } from '../../lib/site-request'
import type { AuthSession, ScrapeFailure } from '../../types'

// A click that read no job (#130), saved with the tab's Generate page state.
// flow: which button was pressed. tabId, tabUrl: the tab it's about and the
// page that tab was on (kept in this browser only). reported: the bug report
// went through.
export type ShownFailure = ScrapeFailure & { flow: 'letter' | 'tailor'; tabId?: number; tabUrl?: string; reported?: boolean }

interface Props {
  failure: ShownFailure
  onReported: () => void
  // Only passed while the paste form is closed, which is when its button makes sense (#130).
  onPaste?: () => void
  onRetry?: () => void
}

// Builds without a backend have nothing to send a site request or bug report
// to, so they show neither (#130).
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

  return <UnsupportedCard failure={failure} />
}

// Styled as a notice card so it reads apart from the paste form below (#130).
// Once the site is requested, the icon and title change so the sent state
// shows at a glance (#195).
function UnsupportedCard({ failure }: { failure: ShownFailure }) {
  const [noted, setNoted] = useState<string | null>(null)
  const [watchSaved, setWatchSaved] = useState<boolean | null>(null)
  const thanks = useRef<HTMLParagraphElement>(null)
  const submitted = useRef(false)
  const session = useHostedSession()

  // The form is gone after a send; focusing its replacement keeps keyboard focus and reads it out (#130).
  useEffect(() => { if (noted && submitted.current) thanks.current?.focus() }, [noted])

  useEffect(() => {
    void requestedSites().then((sites) => { if (sites.includes(failure.host)) setNoted(failure.host) })
  }, [failure.host])

  function sent(site: string, saved: boolean | null) {
    setWatchSaved(saved)
    submitted.current = true
    setNoted(site)
  }

  return (
    <section className="page-read-notice scrape-failure-card" aria-labelledby="scrape-failure-title">
      <div className="news-heading">
        <span className="news-icon" aria-hidden="true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {noted ? <path d="M20 6L9 17l-5-5" /> : (
              <>
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20" />
                <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
              </>
            )}
          </svg>
        </span>
        {/* Fixed text keeps it on one line; the site shows in the field below and the thanks line (#130). */}
        <p id="scrape-failure-title" className="page-read-notice-title">{noted ? 'Site request submitted' : "We can't read this site yet"}</p>
      </div>
      <p>
        Paste the job description below and you&apos;ll still get your{' '}
        {failure.flow === 'letter' ? 'letter' : 'tailored resume'}.
      </p>
      {SUPABASE_URL && (noted ? (
        <>
          <p className="scrape-failure-thanks" ref={thanks} tabIndex={-1}>
            Thanks, we&apos;ve noted {noted}
            {watchSaved && session && <> and we&apos;ll email <span className="site-watch-me" title={session.user.email}>you</span><span className="sr-only"> ({session.user.email})</span> when it&apos;s supported</>}.{' '}
            <a className="text-link" href={`${WEB_URL}/roadmap?utm_source=extension`} target="_blank" rel="noreferrer">See what&apos;s coming →</a>
          </p>
          {watchSaved === false && (
            <p className="scrape-failure-error" role="alert">
              Couldn&apos;t save the email request.{' '}
              <button className="link-button" onClick={() => void saveWatch(noted, true).then(setWatchSaved)}>Try again</button>
            </p>
          )}
        </>
      ) : <SiteRequestForm host={failure.host} session={session} onSent={sent} />)}
    </section>
  )
}

function SiteRequestForm({ host, session, onSent }: { host: string; session: AuthSession | null; onSent: (site: string, watchSaved: boolean | null) => void }) {
  const [value, setValue] = useState(host)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [watch, setWatch] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    // People paste whole addresses, and the server takes only a hostname (#130).
    const site = value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0]
    setSending(true)
    setError('')
    try {
      await sendSiteRequest({ kind: 'site', host: site })
      await rememberRequestedSite(site)
    } catch (err) {
      setError((err as { status?: number }).status === 400
        ? "That doesn't look like a site address, like jobs.example.com."
        : "Couldn't send that. Try again in a moment.")
      setSending(false)
      return
    }
    // A separate send, after the request, so the request's PostHog response stays unlinked (#195).
    onSent(site, watch && session ? await saveWatch(site, true) : null)
  }

  const field = <input className="form-input" aria-label="Job site" value={value} onChange={(e) => setValue(e.target.value)} />
  const button = <button className="btn btn-secondary btn-sm" type="submit" disabled={sending || !value.trim()}>Request this site</button>
  return (
    <form className="site-request" onSubmit={submit}>
      {/* The button comes after the box, so the box reads as part of the request, not a step after it (#195). */}
      {session ? (
        <div className="site-request-stack">
          {field}
          <WatchLabel email={session.user.email} checked={watch} disabled={sending} onChange={setWatch} />
          {button}
        </div>
      ) : (
        <div className="site-request-row">{field}{button}</div>
      )}
      {error && <p className="scrape-failure-error" role="alert">{error}</p>}
    </form>
  )
}

// Signed-in Hosted users only (#195): the email goes to a confirmed account
// address, and BYOK mode keeps its promise of no account data on our side.
function useHostedSession() {
  const [session, setSession] = useState<AuthSession | null>(null)
  useEffect(() => {
    void getMode().then(async (mode) => setSession(mode === 'hosted' ? await ensureValidSession() : null))
  }, [])
  return session
}

async function saveWatch(host: string, watch: boolean): Promise<boolean> {
  try {
    const fresh = await ensureValidSession()
    if (!fresh) return false
    await sendSiteRequest({ kind: 'watch', host, watch }, fresh.access_token)
    return true
  } catch {
    return false
  }
}

function WatchLabel({ email, checked, disabled, onChange }: { email: string; checked: boolean; disabled: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="compact-toggle site-watch">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      {/* The address shows on hover, and screen readers hear it, so the label stays short (#195). */}
      <span>Email <span className="site-watch-me" title={email}>me</span><span className="sr-only"> ({email})</span> when it&apos;s supported</span>
    </label>
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
    // A live region, so screen readers announce the change to "Reported" (#130).
    <div className="bug-report" aria-live="polite">
      <button className="btn btn-secondary btn-sm" onClick={report} disabled={sending || failure.reported}>
        {failure.reported ? "Reported. Thanks, we're on it." : 'Report bug'}
      </button>
      {!failure.reported && <p className="hint bug-report-url">Sends this address: {failure.url}</p>}
      {error && <p className="scrape-failure-error">{error}</p>}
    </div>
  )
}
