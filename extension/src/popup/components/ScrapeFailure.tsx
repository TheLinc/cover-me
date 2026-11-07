import { useEffect, useState } from 'react'
import { SUPABASE_URL, WEB_URL } from '../../lib/config'
import { rememberRequestedSites, requestedSites, sendSiteRequest } from '../../lib/site-request'
import type { ScrapeFailure } from '../../types'

// A click that read no job (#130), saved with the tab's Generate page state.
// flow: which button was pressed. tabId: the tab it's about. reported: the
// bug report went through.
export type ShownFailure = ScrapeFailure & { flow: 'letter' | 'tailor'; tabId?: number; reported?: boolean }

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

  return (
    <section className="scrape-failure">
      <p>
        We can&apos;t read {failure.host} yet. Paste the job description below and you&apos;ll still get your{' '}
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
      await rememberRequestedSites(host, site)
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
      <p className="scrape-failure-thanks">
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
    <div className="bug-report">
      <button className="btn btn-secondary btn-sm" onClick={report} disabled={sending || failure.reported}>
        {failure.reported ? "Reported. Thanks, we're on it." : 'Report bug'}
      </button>
      {!failure.reported && <p className="hint bug-report-url">Sends this address: {failure.url}</p>}
      {error && <p className="scrape-failure-error" role="alert">{error}</p>}
    </div>
  )
}
