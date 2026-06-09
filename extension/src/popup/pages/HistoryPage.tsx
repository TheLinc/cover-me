import { useEffect, useState } from 'react'
import { deleteLetterFromBackend, ensureValidSession, fetchLettersFromBackend } from '../../lib/auth'
import { downloadCoverLetterPdf } from '../../lib/pdf'
import { deleteFromHistory, getCachedTier, getHistory, getSettings, saveHistory } from '../../lib/storage'
import type { CoverLetter } from '../../types'

export default function HistoryPage() {
  const [history, setHistory] = useState<CoverLetter[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const local = await getHistory()
      if (!cancelled) setHistory(local)

      const [settings, tier, session] = await Promise.all([
        getSettings(),
        getCachedTier(),
        ensureValidSession(),
      ])

      if (settings?.mode !== 'hosted' || tier !== 'hosted_pro' || !session) return

      setSyncing(true)
      try {
        const remote = await fetchLettersFromBackend(session.access_token)
        if (cancelled) return
        await saveHistory(remote)
        setHistory(remote)
      } catch {
        // Backend unreachable — keep showing local history
      } finally {
        if (!cancelled) setSyncing(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  async function copy(item: CoverLetter) {
    await navigator.clipboard.writeText(item.letter)
    setCopied(item.id)
    setTimeout(() => setCopied(null), 2000)
  }

  async function remove(id: string) {
    await deleteFromHistory(id)
    setHistory((h) => h.filter((l) => l.id !== id))
    if (expanded === id) setExpanded(null)

    const [settings, tier, session] = await Promise.all([
      getSettings(),
      getCachedTier(),
      ensureValidSession(),
    ])
    if (settings?.mode === 'hosted' && tier === 'hosted_pro' && session) {
      deleteLetterFromBackend(session.access_token, id).catch(() => {})
    }
  }

  function formatDate(iso: string) {
    const d = new Date(iso)
    const diff = Math.floor((Date.now() - d.getTime()) / 1000)
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (diff < 604800) return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">History</h1>
        <p className="page-subtitle">
          {syncing
            ? 'Syncing…'
            : history.length === 0
              ? 'No letters yet'
              : `${history.length} letter${history.length !== 1 ? 's' : ''} generated`}
        </p>
      </div>

      {history.length === 0 ? (
        <div className="history-empty">
          <div className="history-empty-icon">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          Generate your first cover letter<br />to see it here.
        </div>
      ) : (
        <div className="history-list">
          {history.map((item) => (
            <div key={item.id} className="history-item">
              <div className="history-item-header">
                <div>
                  <div className="history-item-title">{item.job.title}</div>
                  <div className="history-item-company">{item.job.company}</div>
                </div>
                <div className="history-item-date">{formatDate(item.createdAt)}</div>
              </div>

              {expanded === item.id && (
                <div className="letter-box" style={{ maxHeight: 180, marginTop: 10 }}>
                  <pre className="letter-text">{item.letter}</pre>
                </div>
              )}

              <div className="history-item-actions">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                >
                  {expanded === item.id ? 'Collapse' : 'Preview'}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => copy(item)}>
                  {copied === item.id ? '✓ Copied' : 'Copy'}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => downloadCoverLetterPdf(item.letter, item.job, item.createdAt)}>
                  PDF
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => remove(item.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
