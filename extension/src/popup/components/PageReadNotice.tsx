import { useEffect, useState } from 'react'
import { SUPABASE_URL, WEB_URL } from '../../lib/config'
import { getPageReadChoice, isPageReadNoticeSnoozed, setPageReadChoice, snoozePageReadNotice, watchPageReadChoice } from '../../lib/storage'

// How job pages are read, at the top of the popup until the user decides.
// Until they agree the page copy isn't sent (preferServerScrapes in
// background/index.ts) and the extension reads postings with its bundled
// scrapers alone. "Not now" hides it until the browser restarts; turning it
// off in Settings (PageReadSetting.tsx) is a decision too, so it stays hidden.
// Chrome Web Store policy asks for disclosure and an action that agrees before
// user data is handled; 1.3.0 started sending the page copy to our server in
// every mode, BYOK included (content/snapshot.ts).
export default function PageReadNotice() {
  const [show, setShow] = useState(false)

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
    // (The notice is still in the DOM here, so look only inside the page under it.)
    document.querySelector<HTMLElement>('.page-content .page button, .page-content .page a[href], .page-content .page input')?.focus()
  }

  return (
    <section className="page-read-notice" aria-labelledby="page-read-notice-title">
      <p id="page-read-notice-title" className="page-read-notice-title">How Cover Me reads a job posting</p>
      <p>
        When you click Generate or Tailor, Cover Me can send a copy of the job page to its server, with scripts,
        form fields and images removed. The copy includes everything else in the page, even parts not on screen,
        like your name if you're signed in to the site. The server pulls out the job title, company and description and keeps no
        copy. This applies with your own API key too, and lets us fix a job site's layout change without an
        update. Until you agree, Cover Me reads postings on your device only, which works on fewer sites. You can
        change this later in Settings.
      </p>
      <div className="page-read-notice-actions">
        <button className="btn btn-primary" onClick={() => close(() => setPageReadChoice(true))}>Agree</button>
        <button className="btn btn-ghost" onClick={() => close(snoozePageReadNotice)}>Not now</button>
        <a className="text-link" href={`${WEB_URL}/privacy`} target="_blank" rel="noreferrer">Privacy policy</a>
      </div>
    </section>
  )
}
