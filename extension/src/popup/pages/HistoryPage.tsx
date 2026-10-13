import { useEffect, useRef, useState } from 'react'
import { deleteApplicationFromBackend, ensureValidSession, fetchApplicationsFromBackend, fetchTier } from '../../lib/auth'
import { downloadCoverLetterPdf } from '../../lib/pdf'
import { downloadTailoredResumePdf } from '../../lib/resume-pdf'
import { capWarning, groupLocalHistory, type JobGroup } from '../../lib/history'
import { deleteFromHistory, deleteFromTailoredHistory, getCachedTier, getHistory, getMode, getTailoredHistory, saveCachedTier } from '../../lib/storage'
import type { ApplicationRecord, AuthSession, CoverLetterEntry } from '../../types'
import UpgradeButton from '../components/UpgradeButton'

function fromApplicationRecords(apps: ApplicationRecord[]): JobGroup[] {
  return apps.map((app) => ({
    key: app.id,
    id: app.id,
    title: app.title,
    company: app.company,
    url: app.url,
    latestAt: app.createdAt,
    coverLetters: app.coverLetters,
    tailoredResumes: app.tailoredResumes,
  }))
}

export default function HistoryPage() {
  const [groups, setGroups] = useState<JobGroup[]>([])
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [isProMode, setIsProMode] = useState(false)
  const [capText, setCapText] = useState<string | null>(null)
  const sessionRef = useRef<AuthSession | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const [letters, tailored] = await Promise.all([getHistory(), getTailoredHistory()])
    setGroups(groupLocalHistory(letters, tailored))

    const [mode, cachedTier, session] = await Promise.all([
      getMode(),
      getCachedTier(),
      ensureValidSession(),
    ])
    let tier = cachedTier

    // A free account close to what this browser keeps sees the upgrade
    // prompt. The tier is checked with the server first, so someone who just
    // paid isn't asked again; an unknown tier shows nothing.
    const warning = capWarning(letters.length, tailored.length)
    if (warning && mode === 'hosted' && session && tier !== 'hosted_pro') {
      const fresh = await fetchTier(session.user.id, session.access_token)
      if (fresh) {
        tier = fresh
        await saveCachedTier(fresh)
      }
      if (tier === 'hosted_free') setCapText(warning)
    }

    if (mode !== 'hosted' || tier !== 'hosted_pro' || !session) return

    sessionRef.current = session
    setIsProMode(true)
    setSyncing(true)
    try {
      const apps = await fetchApplicationsFromBackend(session.access_token)
      setGroups(fromApplicationRecords(apps))
    } catch {
      // Keep showing local groups
    } finally {
      setSyncing(false)
    }
  }

  async function removeGroup(group: JobGroup) {
    if (isProMode && group.id && sessionRef.current) {
      await deleteApplicationFromBackend(sessionRef.current.access_token, group.id).catch(() => {})
    } else {
      for (const id of group.localCoverLetterIds ?? []) {
        await deleteFromHistory(id)
      }
      for (const id of group.localTailoredIds ?? []) {
        await deleteFromTailoredHistory(id)
      }
      // Deleting makes room: recount, so a showing prompt updates or goes.
      const [letters, tailored] = await Promise.all([getHistory(), getTailoredHistory()])
      setCapText((current) => current && capWarning(letters.length, tailored.length))
    }
    setGroups((gs) => gs.filter((g) => g.key !== group.key))
    if (expandedKey === group.key) setExpandedKey(null)
  }

  async function copyLetter(entry: CoverLetterEntry) {
    await navigator.clipboard.writeText(entry.letter)
    setCopiedId(entry.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function formatDate(iso: string) {
    const d = new Date(iso)
    const diff = Math.floor((Date.now() - d.getTime()) / 1000)
    if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))}m ago`
    if (diff < 86400) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (diff < 604800) return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  function formatHostname(url: string) {
    try { return new URL(url).hostname.replace(/^www\./, '') }
    catch { return url }
  }

  function artifactCount(g: JobGroup) {
    const parts = []
    if (g.coverLetters.length) parts.push(`${g.coverLetters.length} cover letter${g.coverLetters.length !== 1 ? 's' : ''}`)
    if (g.tailoredResumes.length) parts.push(`${g.tailoredResumes.length} resume${g.tailoredResumes.length !== 1 ? 's' : ''}`)
    return parts.join(' · ') || 'No artifacts'
  }

  const totalJobs = groups.length

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Applications</h1>
        <p className="page-subtitle">
          {syncing
            ? 'Syncing…'
            : totalJobs === 0
              ? 'No applications yet'
              : `${totalJobs} job${totalJobs !== 1 ? 's' : ''}`}
        </p>
      </div>

      {capText && (
        <div className="cap-prompt">
          <div className="warning-box">{capText}</div>
          <UpgradeButton label="Upgrade to Pro" />
        </div>
      )}

      {totalJobs === 0 ? (
        <div className="history-empty">
          <div className="history-empty-icon">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
            </svg>
          </div>
          Generate a cover letter or tailor your resume<br />on a job posting to see it here.
        </div>
      ) : (
        <div className="history-list">
          {groups.map((group) => {
            const isExpanded = expandedKey === group.key
            return (
              <div key={group.key} className="job-card">
                {/* ── Header ── */}
                <div className="job-card-header">
                  <div className="job-card-title">{group.title || 'Unknown Role'}</div>
                  <div className="job-card-company">{group.company || 'Unknown Company'}</div>
                  {group.url && (
                    <a className="history-item-url" href={group.url} target="_blank" rel="noreferrer" title={group.url}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                      {formatHostname(group.url)}
                    </a>
                  )}
                  <div className="job-card-footer">
                    <span className="job-card-counts">{artifactCount(group)}</span>
                    <span className="job-card-date">{formatDate(group.latestAt)}</span>
                  </div>
                  <div className="job-card-actions">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setExpandedKey(isExpanded ? null : group.key)
                        setPreviewId(null)
                      }}
                    >
                      {isExpanded ? 'Collapse' : 'View'}
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => removeGroup(group)}>
                      Delete
                    </button>
                  </div>
                </div>

                {/* ── Expanded artifacts ── */}
                {isExpanded && (
                  <div className="job-card-body">
                    {group.coverLetters.map((cl, i) => (
                      <div key={cl.id} className="artifact">
                        <div className="artifact-header">
                          <span className="artifact-label">
                            Cover Letter{group.coverLetters.length > 1 ? ` ${i + 1}` : ''}
                          </span>
                          <span className="artifact-date">{formatDate(cl.createdAt)}</span>
                        </div>
                        {previewId === cl.id && (
                          <div className="letter-box letter-preview">
                            <pre className="letter-text">{cl.letter}</pre>
                          </div>
                        )}
                        <div className="artifact-actions">
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setPreviewId(previewId === cl.id ? null : cl.id)}
                          >
                            {previewId === cl.id ? 'Collapse' : 'Preview'}
                          </button>
                          <button className="btn btn-secondary btn-sm" onClick={() => copyLetter(cl)}>
                            {copiedId === cl.id ? '✓ Copied' : 'Copy'}
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => downloadCoverLetterPdf(cl.letter, { title: group.title, company: group.company, url: group.url, description: '' }, cl.createdAt)}
                          >
                            PDF
                          </button>
                        </div>
                      </div>
                    ))}

                    {group.tailoredResumes.map((tr, i) => (
                      <div key={tr.id} className="artifact">
                        <div className="artifact-header">
                          <span className="artifact-label">
                            Tailored Resume{group.tailoredResumes.length > 1 ? ` ${i + 1}` : ''}
                          </span>
                          <span className="artifact-date">{formatDate(tr.createdAt)}</span>
                        </div>
                        <div className="artifact-actions">
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => downloadTailoredResumePdf(tr.resume, group.title)}
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Download PDF
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
