import { useEffect, useState } from 'react'
import { checkForUpdate, updateReady, type UpdateState } from '../../lib/update'

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

  const version = updateReady(state)
  if (!version) return null

  return (
    <button className="btn btn-primary update-ready" title={`Cover Me ${version} is ready. Restart to update.`} onClick={() => chrome.runtime.reload()}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 12a9 9 0 11-3-6.7L21 8" />
        <path d="M21 3v5h-5" />
      </svg>
      Update
    </button>
  )
}
