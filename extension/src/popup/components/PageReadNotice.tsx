import { useEffect, useState } from 'react'
import { SUPABASE_URL, WEB_URL } from '../../lib/config'
import { getPageReadChoice, isPageReadNoticeSnoozed, setPageReadChoice, snoozePageReadNotice, watchPageReadChoice } from '../../lib/storage'

// How job pages are read, under the Generate page's header until the user decides.
// Until they agree the page copy isn't sent (preferServerScrapes in
// background/index.ts) and the extension reads postings with its bundled
// scrapers alone. "Not now" hides it until the browser restarts; turning it
// off in Settings (PageReadSetting.tsx) is a decision too, so it stays hidden.
// Chrome Web Store policy asks for disclosure and an action that agrees before
// user data is handled; 1.3.0 started sending the page copy to our server in
// every mode, BYOK included (content/snapshot.ts).
export default function PageReadNotice() {
  const [show, setShow] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    // A build without a backend never sends the page copy, so there's nothing to agree to.
    if (!SUPABASE_URL) return
    Promise.all([getPageReadChoice(), isPageReadNoticeSnoozed()]).then(([choice, snoozed]) => setShow(choice === undefined && !snoozed))
    // A choice made in Settings while the notice is up closes it.
    return watchPageReadChoice((choice) => { if (choice !== undefined) setShow(false) })
  }, [])

  if (!show) return null

  function close(save: () => Promise<void>) {
    setShow(false)
    void save()
    // The buttons are gone: move keyboard focus to the page's first control, not <body>.
    // (The notice is still in the DOM here, so skip its own controls.)
    const controls = document.querySelectorAll<HTMLElement>('.page button, .page a[href], .page input')
    Array.from(controls).find((el) => !el.closest('.page-read-notice'))?.focus()
  }

  return (
    <section className="page-read-notice" aria-labelledby="page-read-notice-title">
      <p id="page-read-notice-title" className="page-read-notice-title">Send job pages to Cover Me's server?</p>
      <p>
        When a job site changes its layout, we can usually fix it on our side, with no extension update. Pages and their
        addresses are deleted after reading but can include your name.
      </p>
      <button className="page-read-notice-more" aria-expanded={expanded} aria-controls="page-read-notice-details" onClick={() => setExpanded(!expanded)}>
        {expanded ? 'Less' : 'Details'}
      </button>
      {expanded && (
        <div id="page-read-notice-details" className="page-read-notice-details">
          <p>
            Pages are sent when you click Generate or Tailor, with your own API key too. Most scripts, form fields and
            images are removed first; everything else in the page is sent, even parts not on screen. The server pulls
            out the job title, company and description.
          </p>
          <p>
            Until you agree, postings are read on your device only, and a job site's change waits for the next
            extension update. You can change this in Settings.{' '}
            <a className="text-link" href={`${WEB_URL}/privacy`} target="_blank" rel="noreferrer">Privacy policy</a>
          </p>
        </div>
      )}
      <div className="page-read-notice-actions">
        <button className="btn btn-primary btn-sm" onClick={() => close(() => setPageReadChoice(true))}>Agree</button>
        <button className="btn btn-secondary btn-sm" onClick={() => close(snoozePageReadNotice)}>Not now</button>
      </div>
    </section>
  )
}
