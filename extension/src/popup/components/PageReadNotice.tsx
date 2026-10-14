import { useEffect, useState } from 'react'
import { WEB_URL } from '../../lib/config'
import { dismissPageReadNotice, needsPageReadNotice } from '../../lib/storage'

// How job pages are read, shown once at the top of the popup after a new
// install or an update from before 1.3.0, until the user clicks Got it.
// Chrome Web Store policy asks for prominent disclosure when data practices
// change after install; 1.3.0 started sending the page copy to our server in
// every mode, BYOK included (background/index.ts, content/snapshot.ts).
export default function PageReadNotice() {
  const [show, setShow] = useState(false)

  useEffect(() => { needsPageReadNotice().then(setShow) }, [])

  if (!show) return null

  return (
    <section className="page-read-notice" aria-labelledby="page-read-notice-title">
      <h2 id="page-read-notice-title" className="page-read-notice-title">How Cover Me reads a job posting</h2>
      <p>
        When you click Generate or Tailor, Cover Me sends a copy of the job page to its server, with scripts,
        form fields and images removed. The server pulls out the job title, company and description and keeps no
        copy. This happens with your own API key too, and lets us fix a job site's layout change without an update.
      </p>
      <div className="page-read-notice-actions">
        <button className="btn btn-primary" onClick={() => { setShow(false); void dismissPageReadNotice() }}>Got it</button>
        <a className="text-link" href={`${WEB_URL}/privacy`} target="_blank" rel="noreferrer">Privacy policy</a>
      </div>
    </section>
  )
}
