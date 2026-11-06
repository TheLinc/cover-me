import { useEffect, useRef, useState } from 'react'
import { ensureValidSession, uploadResumeToBackend } from '../../lib/auth'
import { DESIGN_CHECK_STALE_MS, DESIGN_UPLOAD_MAX, sha256Hex, toBase64, usesDesign } from '../../lib/design'
import { designUsable } from '../../lib/pdf/docx-design'
import { parseResume } from '../../lib/resume-parser'
import { getCachedTier, getDesignFile, getMode, getResume, getSession, saveDesignFile, saveResume, watchResume } from '../../lib/storage'
import type { DesignCheck, ParsedResume, ResumeData } from '../../types'

type Status = 'idle' | 'parsing' | 'saved' | 'error'

export default function ResumePage({ hideHeader = false }: { hideHeader?: boolean }) {
  const [resume, setResume] = useState<ResumeData | null>(null)
  const [parsed, setParsed] = useState<ParsedResume | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  // Signed in to the account: a copy added while signed out isn't in it yet.
  const [accountMode, setAccountMode] = useState(false)
  const [pro, setPro] = useState(false)
  // The one-time note for a .docx uploaded before its file was kept (#131).
  const [noteDismissed, setNoteDismissed] = useState(true)

  useEffect(() => {
    const show = (r: ResumeData | null) => {
      setResume(r)
      setParsed(r?.parsed ?? null)
      // A sign-in's sync rewrites the resume, so this also catches a sign-in.
      Promise.all([getMode(), getSession(), getCachedTier()]).then(([m, s, t]) => {
        setAccountMode(m === 'hosted' && !!s)
        setPro(t === 'hosted_pro')
      })
    }
    getResume().then(show)
    chrome.storage.local.get('designNoteDismissed').then((r) => setNoteDismissed(r.designNoteDismissed === true))
    return watchResume(show)
  }, [])

  function dismissNote() {
    setNoteDismissed(true)
    void chrome.storage.local.set({ designNoteDismissed: true })
  }

  async function pickLayout(layout: 'yours' | 'cover-me') {
    const current = await getResume()
    if (current) await saveResume({ ...current, layout })
  }

  // The service worker runs the check, so it finishes if the popup closes (lib/design.ts).
  function checkDesign(hash: string) {
    void chrome.runtime.sendMessage({ type: 'CHECK_DESIGN', hash }).catch(() => {})
  }

  async function handleFile(file: File) {
    setStatus('parsing')
    setError('')
    setParsed(null) // clear stale parse on new upload
    try {
      const text = await parseResume(file)
      // A Word file is kept, so tailoring can edit it in place.
      const bytes = file.name.toLowerCase().endsWith('.docx') ? new Uint8Array(await file.arrayBuffer()) : null
      const hash = bytes ? await sha256Hex(bytes) : undefined
      // ensureValidSession refreshes an expired token (or clears a dead session),
      // so the upload below doesn't fail with a stale token.
      const [mode, session] = await Promise.all([getMode(), ensureValidSession()])
      const hosted = mode === 'hosted' && !!session
      // Signed in (either mode): the copy belongs to this account. Signed out
      // after an account was here: it keeps that owner, so another account can't
      // claim it, and is marked so the owner's next sign-in doesn't upload it
      // either (it may be someone else's). See syncResume in lib/auth.ts.
      const inherited = session ? undefined : (await getResume())?.accountId
      const data: ResumeData = {
        text, filename: file.name, updatedAt: new Date().toISOString(),
        ...(session ? { accountId: session.user.id } : inherited ? { accountId: inherited, signedOutUpload: true } : {}),
        ...(bytes && hash ? { design: { hash, size: bytes.length, status: 'checking' as const, checkedAt: new Date().toISOString() } } : {}),
      }
      // The resume first: a file stored before anything points to it could be
      // pruned by a History save in between.
      await saveResume(data)
      if (bytes && hash) {
        // The same file again keeps the parse it was checked against.
        await saveDesignFile(hash, { ...(await getDesignFile(hash)), data: toBase64(bytes) })
        checkDesign(hash)
      }
      dismissNote()
      setResume(data)
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2500)

      // Best-effort cloud sync for hosted users. A Word file's check uploads
      // the text itself and waits for the server's parse of it: a second
      // upload here would start a second parse that can come out different.
      // Its failures show on the card.
      if (hosted && session && !bytes) {
        uploadResumeToBackend(session.access_token, text, file.name).catch((err) => {
          setError(`Saved locally, but cloud sync failed: ${err instanceof Error ? err.message : 'unknown error'}`)
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse resume')
      setStatus('error')
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function formatAge(iso: string) {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return new Date(iso).toLocaleDateString()
  }

  function parsedSummary(p: ParsedResume): string {
    return [
      `${p.experience.length} experience ${p.experience.length === 1 ? 'entry' : 'entries'}`,
      p.projects?.length ? `${p.projects.length} ${p.projects.length === 1 ? 'project' : 'projects'}` : null,
      `${p.education.length} ${p.education.length === 1 ? 'education entry' : 'education entries'}`,
      p.skills ? 'skills' : null,
      p.certifications?.length ? `${p.certifications.length} cert${p.certifications.length === 1 ? '' : 's'}` : null,
    ].filter(Boolean).join(' · ')
  }

  const wordUpload = !!resume?.filename.toLowerCase().endsWith('.docx')

  return (
    <div className="page">
      {!hideHeader && (
        <div className="page-header">
          <h1 className="page-title">Resume</h1>
          <p className="page-subtitle">Upload once — used for every cover letter</p>
        </div>
      )}

      <div
        className={`upload-area${dragOver ? ' drag-over' : ''}`}
        // The input's own click bubbles here too; don't open the picker twice.
        onClick={(e) => { if (e.target !== inputRef.current) inputRef.current?.click() }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          className="upload-input"
          type="file"
          aria-label="Upload your resume (PDF, DOCX or TXT)"
          accept=".pdf,.docx,.txt"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
        {status === 'parsing' ? (
          <>
            <div className="spinner upload-spinner" />
            <p className="upload-title">Parsing…</p>
          </>
        ) : (
          <>
            <div className="upload-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <p className="upload-title">{resume ? 'Replace resume' : 'Upload your resume'}</p>
            <p className="upload-hint">Upload a Word file (.docx) to keep your own design. From Google Docs, use File, Download, Microsoft Word.</p>
          </>
        )}
      </div>

      {error && (
        <div className="error-box resume-error">{error}</div>
      )}

      {resume && status !== 'parsing' && (
        <>
          <div className="divider" />
          <div className="resume-card">
            <div className="resume-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div className="resume-info">
              <div className="resume-name">{resume.filename}</div>
              <div className="resume-meta">
                Updated {formatAge(resume.updatedAt)} · ~{Math.round(resume.text.length / 5)} words
              </div>
              {parsed && (
                <div className="resume-sections">{parsedSummary(parsed)}</div>
              )}
              {resume.signedOutUpload && accountMode && (
                <div className="hint hint-tight">Added while signed out, so it isn&apos;t in your account yet. Upload it again to use it for letters.</div>
              )}
              {/* The letter and parse prompts read only this much (lib/ai/index.ts, lib/ai/resume-parse.ts). */}
              {resume.text.length > 12000 && (
                <div className="hint hint-tight">Only the first 12,000 characters (about 2,400 words) are used. Shorten your resume so letters and tailored resumes include everything.</div>
              )}
              {!wordUpload && (
                <div className="hint hint-tight">Upload your resume as a Word file (.docx) and tailored resumes keep its design.</div>
              )}
            </div>
            {status === 'saved' && (
              <span className="success-badge">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Saved
              </span>
            )}
          </div>
          {resume.design && (
            <LayoutChoice
              design={resume.design}
              yours={usesDesign(resume)}
              onPick={(l) => void pickLayout(l)}
              onRetry={() => checkDesign(resume.design!.hash)}
              dashboardFallback={accountMode && pro && resume.design.size > DESIGN_UPLOAD_MAX}
            />
          )}
          {wordUpload && !resume.design && !noteDismissed && (
            <div className="design-note">
              <span>New: upload your .docx again and tailored resumes keep its design.</span>
              <button type="button" className="design-note-close" aria-label="Dismiss" onClick={dismissNote}>×</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

const LAYOUT_GUIDE = 'https://www.cover-me.dev/guides/ats-friendly-resume-format?utm_source=extension&utm_content=layout-check'
const LAYOUT_WORDS = { columns: 'two columns', table: 'tables', textbox: 'text boxes' } as const

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
const clip = (s: string) => (s.length > 40 ? `${s.slice(0, 40).trimEnd()}…` : s)

// What to fix in Word when too few bullets can be edited in place.
function designReasons(c: DesignCheck): string[] {
  if (c.total === 0) return ['No bullets were found under your experience. Check the file has them, then upload it again.']
  const loose = c.unmatched.length - c.textBoxBullets
  const reasons: string[] = []
  if (c.textBoxBullets > 0) reasons.push(`${count(c.textBoxBullets, 'bullet is', 'bullets are')} inside text boxes. Move them into normal paragraphs in Word and upload again.`)
  if (loose > 0) reasons.push(`${count(loose, "bullet isn't in a paragraph of its own", "bullets aren't in paragraphs of their own")}. In Word, press Enter between bullets (not Shift+Enter) and upload again.`)
  return reasons
}

function LayoutChoice({ design, yours, onPick, onRetry, dashboardFallback }: {
  design: NonNullable<ResumeData['design']>
  yours: boolean
  onPick: (layout: 'yours' | 'cover-me') => void
  onRetry: () => void
  dashboardFallback: boolean
}) {
  // Re-renders once the check would count as stale, for a popup left open.
  const [, setNow] = useState(0)
  const left = DESIGN_CHECK_STALE_MS - (Date.now() - Date.parse(design.checkedAt ?? ''))
  useEffect(() => {
    if (design.status !== 'checking' || !(left > 0)) return
    const t = setTimeout(() => setNow(Date.now()), left + 100)
    return () => clearTimeout(t)
  }, [design.status, left])
  const stale = design.status === 'checking' && left <= 0
  if (stale) {
    return (
      <p className="hint design-choice">
        Checking your design didn&apos;t finish.{' '}
        <button type="button" className="upload-link design-retry" onClick={onRetry}>Try again</button>
      </p>
    )
  }
  if (design.status === 'checking') {
    return <p className="design-checking" role="status"><span className="spinner design-spinner" aria-hidden />Checking your design…</p>
  }
  if (design.status === 'error' || !design.check) {
    return (
      <p className="hint design-choice">
        {design.error ?? "Couldn't check your design."}{' '}
        <button type="button" className="upload-link design-retry" onClick={onRetry}>Try again</button>
      </p>
    )
  }
  const c = design.check
  const usable = designUsable(c)
  return (
    <fieldset className="design-choice">
      <legend className="sr-only">Layout for tailored resumes</legend>
      <label className={`design-option${usable ? '' : ' disabled'}`}>
        <input type="radio" name="layout" checked={yours} disabled={!usable} onChange={() => onPick('yours')} />
        <span>
          <span className="design-option-title">
            {!usable && (
              <svg className="design-warn" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            )}
            Your design (Beta)
          </span>
          <span className="design-option-desc">Tailors your bullets inside your own Word file.</span>
        </span>
      </label>
      <div className="design-readout">
        {usable ? (
          <>
            <p>{c.matched} of {count(c.total, 'bullet', 'bullets')} can be tailored</p>
            {c.unmatched.length > 0 && (
              <p>{count(c.unmatched.length, 'bullet stays', 'bullets stay')} as written: {c.unmatched.map((b) => `'${clip(b)}'`).join(', ')}</p>
            )}
            <p>Summary: {c.summary ? 'rewritten' : 'none in your file'}</p>
            {c.skills !== 'none' && (
              <p>Skills: {c.skills === 'reordered' ? 'reordered' : c.skills === 'table' ? "kept as written (they're in a table)" : "kept as written (they're on several lines)"}</p>
            )}
          </>
        ) : (
          designReasons(c).map((r) => <p key={r}>{r}</p>)
        )}
        {c.layoutWarning && (
          <p>
            Your layout uses {LAYOUT_WORDS[c.layoutWarning]}, which some application systems read out of order.{' '}
            <a className="text-link" href={LAYOUT_GUIDE} target="_blank" rel="noreferrer">Learn more</a>
          </p>
        )}
        {usable && dashboardFallback && (
          <p>Your file is over 2 MB, so your account&apos;s dashboard uses the Cover Me layout for it.</p>
        )}
      </div>
      <label className="design-option">
        <input type="radio" name="layout" checked={!yours} onChange={() => onPick('cover-me')} />
        <span>
          <span className="design-option-title">Cover Me layout</span>
          <span className="design-option-desc">Clean ATS layout. Adds a summary, compact to one page, Word or PDF.</span>
        </span>
      </label>
    </fieldset>
  )
}
