import { useEffect, useState } from 'react'
import { checkForUpdate, updateCard, type UpdateState } from '../../lib/update'

const KEYS = ['pendingUpdate', 'coverJob', 'tailorJob'] as const

export default function UpdateReady() {
  const [state, setState] = useState<UpdateState>({})

  useEffect(() => {
    const load = () => void chrome.storage.local.get([...KEYS]).then((r) => setState(r as UpdateState))
    load()
    void checkForUpdate()
    const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && KEYS.some((k) => k in changes)) load()
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  const card = updateCard(state)
  if (!card) return null

  return (
    <section className="page-read-notice update-ready" aria-labelledby="update-ready-title">
      <div className="news-heading">
        <span className="news-icon" aria-hidden="true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 11-3-6.7L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
        </span>
        <p id="update-ready-title" className="page-read-notice-title">Cover Me {card.version} is ready</p>
      </div>
      {!card.canRestart && <p id="update-ready-wait">You can restart after this finishes.</p>}
      <div className="page-read-notice-actions">
        <button
          className="btn btn-primary btn-sm"
          disabled={!card.canRestart}
          aria-describedby={card.canRestart ? undefined : 'update-ready-wait'}
          onClick={() => chrome.runtime.reload()}
        >
          Restart to update
        </button>
      </div>
    </section>
  )
}
