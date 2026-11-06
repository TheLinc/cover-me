import { useEffect, useState } from 'react'
import { WEB_URL } from '../../lib/config'
import { clearWhatsNew, getWhatsNew } from '../../lib/storage'

// No click tracking here: ?from=extension shows these visits in site analytics.
const CHANGELOG_URL = `${WEB_URL}/changelog?from=extension`

// The Generate page header, after a minor or major update
// (background/install.ts). Clicking it (or middle-clicking) is the only thing that clears it.
export function WhatsNewLink() {
  const [version, setVersion] = useState<string | null>(null)
  useEffect(() => { void getWhatsNew().then(setVersion) }, [])
  if (!version) return null
  const seen = () => { void clearWhatsNew(); setVersion(null) }
  return (
    <a
      className="text-link whats-new"
      href={`${CHANGELOG_URL}#v${version}`}
      target="_blank"
      rel="noreferrer"
      onClick={seen}
      onAuxClick={(e) => { if (e.button === 1) seen() }}
    >
      What's new<span className="whats-new-dot" aria-hidden="true" />
    </a>
  )
}

// Settings: the same page, always there.
export function WhatsNewSetting() {
  return (
    <section className="page-read-setting" aria-labelledby="whats-new-title">
      <h2 id="whats-new-title" className="page-read-setting-title">Updates</h2>
      <p className="page-read-setting-hint">What changed in each version of Cover Me.</p>
      <div className="review-ask-actions">
        <a className="text-link" href={CHANGELOG_URL} target="_blank" rel="noreferrer">What's new</a>
      </div>
    </section>
  )
}
