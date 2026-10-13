import { useEffect, useRef, useState } from 'react'
import { deleteApplicationFromBackend, ensureValidSession, fetchApplicationsFromBackend, fetchTier, uploadLocalHistory, UploadError } from '../../lib/auth'
import { downloadCoverLetterPdf } from '../../lib/pdf'
import { downloadTailoredResumePdf } from '../../lib/resume-pdf'
import { accountUpdates, capWarning, groupLocalHistory, groupsFromApplications, ownPending, uploadMessage, uploadSummary, withLocalOnly, type JobGroup } from '../../lib/history'
import { deleteFromHistory, deleteFromTailoredHistory, getCachedTier, getHistory, getMode, getTailoredHistory, getUploadAsked, markUploadAsked, saveCachedTier, setEntryAccounts } from '../../lib/storage'
import type { AuthSession, CoverLetter, CoverLetterEntry, TailoredHistoryEntry } from '../../types'
import UpgradeButton from '../components/UpgradeButton'

export default function HistoryPage() {
  const [groups, setGroups] = useState<JobGroup[]>([])
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [isProMode, setIsProMode] = useState(false)
  const [capText, setCapText] = useState<string | null>(null)
  // Pro: applications that exist only in this browser. asked = this account
  // already answered the prompt, so the quiet link shows instead.
  const [upload, setUpload] = useState<{ count: number; asked: boolean } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadNote, setUploadNote] = useState<{ text: string; error: boolean } | null>(null)
  const sessionRef = useRef<AuthSession | null>(null)

  useEffect(() => {
    load()
  }, [])

  // Asks the server which local entries it already holds (people who were Pro
  // before 1.3.0 saved their letters under the same IDs) and marks them.
  // Returns what's left in this browser only; null when the check failed, in
  // which case nothing is tagged or offered.
  async function localOnlyAfterCheck(session: AuthSession): Promise<{ letters: CoverLetter[]; tailored: TailoredHistoryEntry[] } | null> {
    const [letters, tailored] = await Promise.all([getHistory(), getTailoredHistory()])
    const l = letters.filter((e) => !e.account)
    const t = tailored.filter((e) => !e.account)
    if (l.length + t.length === 0) return { letters: [], tailored: [] }
    try {
      const result = await uploadLocalHistory(session.access_token, l, t, true)
      await setEntryAccounts(accountUpdates({ letters: l.map((e) => e.id), tailored: t.map((e) => e.id) }, result, session.user.id, true))
      const mine = new Set([...result.letters, ...result.tailored])
      return { letters: l.filter((e) => !mine.has(e.id)), tailored: t.filter((e) => !mine.has(e.id)) }
    } catch {
      return null
    }
  }

  // Entries made while this account was Pro were always meant for it. If
  // their save didn't go through (offline, a server error), it's retried here
  // without asking. Returns what's still only in this browser, and whether
  // anything new reached the account.
  async function retryOwn(session: AuthSession, local: { letters: CoverLetter[]; tailored: TailoredHistoryEntry[] }) {
    const own = ownPending(local.letters, local.tailored, session.user.id)
    if (own.letters.length + own.tailored.length === 0) return { ...local, saved: false }
    try {
      const result = await uploadLocalHistory(session.access_token, own.letters, own.tailored)
      const submitted = { letters: own.letters.map((e) => e.id), tailored: own.tailored.map((e) => e.id) }
      await setEntryAccounts(accountUpdates(submitted, result, session.user.id, false))
      // Settled: now in this account, or already another account's. Failed ones stay.
      const failed = new Set(result.failed)
      const settled = new Set([...submitted.letters, ...submitted.tailored].filter((id) => !failed.has(id)))
      return {
        letters: local.letters.filter((e) => !settled.has(e.id)),
        tailored: local.tailored.filter((e) => !settled.has(e.id)),
        saved: result.letters.length + result.tailored.length > 0,
      }
    } catch {
      return { ...local, saved: false }
    }
  }

  async function saveLocal() {
    if (uploading) return
    setUploadNote(null)
    const session = await ensureValidSession()
    if (!session) {
      setUploadNote({ text: 'Sign in again in Settings to save them.', error: true })
      return
    }
    setUploading(true)
    await markUploadAsked(session.user.id)
    try {
      const [letters, tailored] = await Promise.all([getHistory(), getTailoredHistory()])
      const l = letters.filter((e) => !e.account)
      const t = tailored.filter((e) => !e.account)
      const result = await uploadLocalHistory(session.access_token, l, t)
      await setEntryAccounts(accountUpdates({ letters: l.map((e) => e.id), tailored: t.map((e) => e.id) }, result, session.user.id, false))
      setUploadNote({ text: uploadMessage(uploadSummary(l, t, result)), error: false })
      await load()
    } catch (err) {
      if (err instanceof UploadError && err.status === 403) {
        setUpload(null)
        const fresh = await fetchTier(session.user.id, session.access_token)
        if (fresh) await saveCachedTier(fresh)
      } else {
        setUploadNote({ text: "Couldn't save them. Check your connection and try again.", error: true })
      }
    } finally {
      setUploading(false)
    }
  }

  async function notNow() {
    if (sessionRef.current) await markUploadAsked(sessionRef.current.user.id)
    setUpload((u) => u && { ...u, asked: true })
  }

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
      if (tier === 'hosted_free') {
        // Counted again: the user may have deleted something during the checks.
        const [l, t] = await Promise.all([getHistory(), getTailoredHistory()])
        setCapText(capWarning(l.length, t.length))
      }
    }

    if (mode !== 'hosted' || tier !== 'hosted_pro' || !session) return

    sessionRef.current = session
    setIsProMode(true)
    setSyncing(true)
    try {
      let server = groupsFromApplications(await fetchApplicationsFromBackend(session.access_token))
      setGroups(server)
      const checked = await localOnlyAfterCheck(session)
      if (checked) {
        const local = await retryOwn(session, checked)
        if (local.saved) server = groupsFromApplications(await fetchApplicationsFromBackend(session.access_token))
        setGroups(withLocalOnly(server, local.letters, local.tailored))
        const count = groupLocalHistory(local.letters, local.tailored).length
        setUpload(count > 0 ? { count, asked: (await getUploadAsked()).includes(session.user.id) } : null)
      } else {
        setUpload(null)
      }
    } catch {
      // Keep showing local groups. A cached Pro tier that's out of date is
      // refreshed, so the next open takes the free path.
      const fresh = await fetchTier(session.user.id, session.access_token)
      if (fresh) await saveCachedTier(fresh)
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
      if (isProMode) setUpload((u) => (u && u.count > 1 ? { ...u, count: u.count - 1 } : null))
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
      {upload && !upload.asked && (
        <div className="upload-prompt">
          <p className="upload-prompt-text">
            Save {upload.count} application{upload.count === 1 ? '' : 's'} from this browser to your account? They'll show on every device and on your dashboard, where you can search them.
          </p>
          <button className="btn btn-primary" onClick={saveLocal} disabled={uploading}>
            {uploading ? 'Saving…' : 'Save to my account'}
          </button>
          <button className="btn btn-ghost" onClick={notNow} disabled={uploading}>Not now</button>
        </div>
      )}
      {upload && upload.asked && (
        <button className="upload-link" onClick={saveLocal} disabled={uploading}>
          {uploading ? 'Saving…' : `Save ${upload.count} application${upload.count === 1 ? '' : 's'} from this browser`}
        </button>
      )}
      <div aria-live="polite">
        {uploadNote && <div className={uploadNote.error ? 'error-box' : 'notice-box'}>{uploadNote.text}</div>}
      </div>

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
                    <span className="job-card-date">
                      {group.localOnly && <span className="local-tag">Only in this browser · </span>}
                      {formatDate(group.latestAt)}
                    </span>
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
