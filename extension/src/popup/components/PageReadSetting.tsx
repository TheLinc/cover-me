import { useEffect, useState } from 'react'
import { SUPABASE_URL, WEB_URL } from '../../lib/config'
import { getPageReadChoice, setPageReadChoice, watchPageReadChoice } from '../../lib/storage'
import { ChevronIcon } from './icons'

// The same choice as the notice (PageReadNotice.tsx), kept in Settings so the
// user can agree after "Not now", or turn it off later. Turning it off is
// remembered, so the notice doesn't ask again. Once agreed, it opens collapsed:
// a native <details>, open at load only while the box is unticked, so ticking
// it doesn't snap the section shut under the pointer.
export default function PageReadSetting() {
  const [agreed, setAgreed] = useState<boolean | null>(null)
  const [startOpen, setStartOpen] = useState(true)

  useEffect(() => {
    getPageReadChoice().then((choice) => {
      setAgreed(choice === true)
      setStartOpen(choice !== true)
    })
    // Agreeing in the notice while Settings is open ticks the box.
    return watchPageReadChoice((choice) => setAgreed(choice === true))
  }, [])

  // A build without a backend never sends the page copy, so there's nothing to choose.
  if (!SUPABASE_URL || agreed === null) return null

  return (
    <section className="page-read-setting" aria-labelledby="page-read-setting-title">
      <details className="setting-details" open={startOpen}>
      <summary className="setting-summary">
        <h2 id="page-read-setting-title" className="page-read-setting-title">Reading job pages</h2>
        <span className="setting-state">{agreed ? 'On' : 'Off'}</span>
        <ChevronIcon />
      </summary>
      <label className="compact-toggle">
        <input type="checkbox" checked={agreed} onChange={(e) => { setAgreed(e.target.checked); void setPageReadChoice(e.target.checked) }} />
        Send the job page's address and a copy of it to Cover Me's server to read it
      </label>
      <p className="page-read-setting-hint">
        When a job site changes, we can usually fix it on our server, with no extension update. The copy has most scripts, form fields and images removed, but includes everything else in the
        page, even parts not on screen, like your name if you're signed in to the site. The server deletes the copy once it's read. Off: postings are read on
        your device only, and a site's change waits for the next extension update. <a className="text-link" href={`${WEB_URL}/privacy`} target="_blank" rel="noreferrer">Privacy policy</a>
      </p>
      </details>
    </section>
  )
}
