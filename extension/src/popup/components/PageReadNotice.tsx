import { useEffect, useState } from 'react'
import { WEB_URL } from '../../lib/config'
import { dismissPageReadNotice, needsPageReadNotice } from '../../lib/storage'

// How job pages are read, shown at the top of the popup after a new install or
// an update from before 1.3.0, until the user clicks I understand. Until then
// the page copy isn't sent (preferServerScrapes in background/index.ts): the
// extension reads postings with its bundled scrapers alone.
// Chrome Web Store policy asks for prominent disclosure when data practices
// change after install; 1.3.0 started sending the page copy to our server in
// every mode, BYOK included (background/index.ts, content/snapshot.ts).
export default function PageReadNotice() {
  const [show, setShow] = useState(false)

  useEffect(() => { needsPageReadNotice().then(setShow) }, [])

  if (!show) return null

  function dismiss() {
    setShow(false)
    void dismissPageReadNotice()
    // The button is gone, so keyboard focus moves to the page rather than dropping to <body>.
    document.querySelector<HTMLElement>('.page-content')?.focus()
  }

  return (
    <section className="page-read-notice" aria-labelledby="page-read-notice-title">
      <p id="page-read-notice-title" className="page-read-notice-title">How Cover Me reads a job posting</p>
      <p>
        When you click Generate or Tailor, Cover Me sends a copy of the job page to its server, with scripts,
        form fields and images removed. The copy includes anything else shown on the page, like your name if
        you're signed in to the site. The server pulls out the job title, company and description and keeps no
        copy. This happens with your own API key too, and lets us fix a job site's layout change without an
        update. Until you click I understand, Cover Me reads postings on your device only.
      </p>
      <div className="page-read-notice-actions">
        <button className="btn btn-primary" onClick={dismiss}>I understand</button>
        <a className="text-link" href={`${WEB_URL}/privacy`} target="_blank" rel="noreferrer">Privacy policy</a>
      </div>
    </section>
  )
}
