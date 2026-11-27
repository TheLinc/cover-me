import { useEffect, useRef, useState, type ReactNode } from 'react'
import { uploadResumeToBackend } from '../../lib/auth'
import { DESIGN_CHECK_STALE_MS, DESIGN_UPLOAD_MAX, usesDesign } from '../../lib/design'
import { designUsable } from '../../lib/pdf/docx-design'
import { MAX_RESUME_CHARS } from '../../lib/ai/resume-parse'
import { needsUploadNote } from '../../lib/reread'
import { downloadStoredFile, saveUpload, storedFile } from '../../lib/resume-file'
import { parseResume } from '../../lib/resume-parser'
import { getCachedTier, getMode, getResume, getSession, saveResume, watchResume } from '../../lib/storage'
import type { DesignCheck, ParsedResume, ResumeData } from '../../types'
import { DownloadIcon, FileTypeIcon, RegenerateIcon } from '../components/icons'
import { Reveal, TemplateSetting } from '../components/TemplatePicker'

type Status = 'idle' | 'parsing' | 'saved' | 'error'

export default function ResumePage({ hideHeader = false }: { hideHeader?: boolean }) {
  const [resume, setResume] = useState<ResumeData | null>(null)
  const [parsed, setParsed] = useState<ParsedResume | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  // dragenter and dragleave fire for every child the file passes over (#342).
  const dragDepth = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)
  // Signed in to the account: a copy added while signed out isn't in it yet (#16).
  const [accountMode, setAccountMode] = useState(false)
  const [pro, setPro] = useState(false)
  // Existing users: the "New" notice the Resume tab's dot leads to (#131).
  const [news, setNews] = useState(false)
  const [noteSeen, setNoteSeen] = useState(true)

  useEffect(() => {
    const show = (r: ResumeData | null) => {
      setResume(r)
      setParsed(r?.parsed ?? null)
      // A sign-in's sync rewrites the resume, so this also catches a sign-in (#16).
      Promise.all([getMode(), getSession(), getCachedTier()]).then(([m, s, t]) => {
        setAccountMode(m === 'hosted' && !!s)
        setPro(t === 'hosted_pro')
      })
    }
    getResume().then(show)
    chrome.storage.local.get(['designNews', 'readerNote']).then((r) => {
      setNews(r.designNews === 'pending' || r.designNews === 'opened')
      setNoteSeen(r.readerNote === 'seen')
    })
    return watchResume(show)
  }, [])

  function dismissReaderNote() {
    setNoteSeen(true)
    void chrome.storage.local.set({ readerNote: 'seen' })
  }

  function dismissNews() {
    setNews(false)
    void chrome.storage.local.set({ designNews: 'seen' })
  }

  async function pickLayout(layout: 'yours' | 'cover-me') {
    const current = await getResume()
    if (current) await saveResume({ ...current, layout })
  }

  // The service worker runs the check, so it finishes if the popup closes (lib/design.ts) (#131).
  function checkDesign(hash: string) {
    void chrome.runtime.sendMessage({ type: 'CHECK_DESIGN', hash }).catch(() => {})
  }

  async function handleFile(file: File) {
    setStatus('parsing')
    setError('')
    setParsed(null)
    try {
      const text = await parseResume(file)
      const { resume: data, word, hosted } = await saveUpload(file, text)
      if (word) checkDesign(word)
      dismissNews()
      setResume(data)
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2500)

      // Best-effort cloud sync for hosted users. A Word file's check uploads
      // the text itself and waits for the server's parse of it: a second
      // upload here would start a second parse that can come out different.
      // Its failures show on the card (#131).
      if (hosted && !word) {
        uploadResumeToBackend(hosted.access_token, text, file.name, false, { readerVersion: data.readerVersion, uploadedAt: data.uploadedAt }).catch((err) => {
          setError(`Saved locally, but cloud sync failed: ${err instanceof Error ? err.message : 'unknown error'}`)
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse resume')
      setStatus('error')
    }
  }

  const hasFiles = (e: React.DragEvent) => e.dataTransfer.types.includes('Files')

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function formatAge(iso: string) {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(d.getFullYear() !== new Date().getFullYear() && { year: 'numeric' }) })
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
  const readerNote = needsUploadNote(resume, noteSeen)
  const kept = resume ? storedFile(resume) : undefined

  return (
    <div
      className={`page resume-page${dragging ? ' dropping' : ''}`}
      onDragEnter={(e) => { if (hasFiles(e)) { dragDepth.current++; setDragging(true) } }}
      onDragOver={(e) => { if (hasFiles(e)) e.preventDefault() }}
      onDragLeave={(e) => { if (hasFiles(e) && --dragDepth.current === 0) setDragging(false) }}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        hidden
        accept=".pdf,.docx,.txt"
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) handleFile(f) }}
      />
      {dragging && (
        <div className="drop-overlay" aria-hidden="true">
          {resume ? `Drop to replace ${resume.filename}` : 'Drop to upload your resume'}
        </div>
      )}
      {!hideHeader && (
        <div className="page-header">
          <h1 className="page-title">Resume</h1>
          <p className="page-subtitle">Upload once. Used for every letter and tailored resume.</p>
        </div>
      )}

      {readerNote && (
        <section className="page-read-notice" aria-labelledby="reader-note-title">
          <p id="reader-note-title" className="page-read-notice-title">Re-upload your resume</p>
          <p>Cover Me reads resumes better now. It keeps the links behind clickable text and the order of your sections. Upload yours again, and future improvements will apply on their own.</p>
          <div className="page-read-notice-actions">
            <button className="btn btn-primary btn-sm" onClick={() => inputRef.current?.click()}>Upload again</button>
            <button className="btn btn-secondary btn-sm" onClick={dismissReaderNote}>Not now</button>
          </div>
        </section>
      )}

      {news && !readerNote && resume && !resume.design && (
        <section className="page-read-notice" aria-labelledby="design-news-title">
          <div className="news-heading">
            <span className="news-icon" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 003.4 0" />
              </svg>
            </span>
            <p id="design-news-title" className="page-read-notice-title">New: tailor inside your own Word design</p>
          </div>
          <p>
            {wordUpload
              ? 'Upload your .docx again, and tailored resumes keep its fonts and layout instead of switching to the Cover Me layout.'
              : 'Upload your resume as a Word file (.docx), and tailored resumes keep its fonts and layout instead of switching to the Cover Me layout.'}
          </p>
          <div className="page-read-notice-actions">
            <button className="btn btn-primary btn-sm" onClick={() => inputRef.current?.click()}>Upload .docx</button>
            <button className="btn btn-secondary btn-sm" onClick={dismissNews}>Not now</button>
          </div>
        </section>
      )}

      {status === 'parsing' ? (
        <div className="resume-card resume-reading" role="status">
          <span className="spinner design-spinner" aria-hidden />Reading your resume…
        </div>
      ) : !resume && (
        <div className="upload-area" onClick={() => inputRef.current?.click()}>
          <div className="upload-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <p className="upload-title">Upload your resume</p>
          <button type="button" className="btn btn-primary btn-sm upload-choose">Choose a file</button>
          <p className="upload-hint">PDF, Word or text. A Word file (.docx) lets tailored resumes keep your own design. From Google Docs, use File, Download, Microsoft Word.</p>
        </div>
      )}

      {resume && status !== 'parsing' && (
        <>
          <div className="resume-card">
            <div className="resume-row">
              <FileTypeIcon filename={resume.filename} />
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
                {/* The letter and parse prompts read only this much (lib/ai/index.ts, lib/ai/resume-parse.ts) (#31). */}
                {resume.text.length > MAX_RESUME_CHARS && (
                  <div className="hint hint-tight">Only the first {MAX_RESUME_CHARS.toLocaleString('en-US')} characters (about {Math.round(MAX_RESUME_CHARS / 5).toLocaleString('en-US')} words) are used. Shorten your resume so letters and tailored resumes include everything.</div>
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
            <div className="resume-actions">
              {kept && (
                <button type="button" className="btn btn-secondary btn-sm" aria-label={`Download ${resume.filename}`} onClick={() => void downloadStoredFile(kept.id, resume.filename)}>
                  <DownloadIcon />Download
                </button>
              )}
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => inputRef.current?.click()}>
                <RegenerateIcon />Replace
              </button>
            </div>
          </div>
          <LayoutChoice
            design={resume.design}
            wordUpload={wordUpload}
            yours={usesDesign(resume)}
            onPick={(l) => void pickLayout(l)}
            onRetry={() => resume.design && checkDesign(resume.design.hash)}
            onUpload={() => inputRef.current?.click()}
            dashboardFallback={accountMode && pro && !!resume.design && resume.design.size > DESIGN_UPLOAD_MAX}
          />
        </>
      )}

      {error && (
        <div className="error-box resume-error">{error}</div>
      )}
    </div>
  )
}

const LAYOUT_GUIDE = 'https://www.cover-me.dev/guides/ats-friendly-resume-format?utm_source=extension&utm_content=layout-check'
const LAYOUT_WORDS = { columns: 'two columns', table: 'tables', textbox: 'text boxes' } as const

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
const clip = (s: string) => (s.length > 40 ? `${s.slice(0, 40).trimEnd()}…` : s)

// What to fix in Word when too few bullets can be edited in place (#131).
function designReasons(c: DesignCheck): string[] {
  if (c.total === 0) return ['No bullets were found under your experience. Check the file has them, then upload it again.']
  const loose = c.unmatched.length - c.textBoxBullets
  const reasons: string[] = []
  if (c.textBoxBullets > 0) reasons.push(`${count(c.textBoxBullets, 'bullet is', 'bullets are')} inside text boxes. Move them into normal paragraphs in Word and upload again.`)
  if (loose > 0) reasons.push(`${count(loose, "bullet isn't in a paragraph of its own", "bullets aren't in paragraphs of their own")}. In Word, press Enter between bullets (not Shift+Enter) and upload again.`)
  return reasons
}

function LayoutChoice({ design, wordUpload, yours, onPick, onRetry, onUpload, dashboardFallback }: {
  design: ResumeData['design']
  wordUpload: boolean
  yours: boolean
  onPick: (layout: 'yours' | 'cover-me') => void
  onRetry: () => void
  onUpload: () => void
  dashboardFallback: boolean
}) {
  // Re-renders once the check would count as stale, for a popup left open (#131).
  const [, setNow] = useState(0)
  const left = DESIGN_CHECK_STALE_MS - (Date.now() - Date.parse(design?.checkedAt ?? ''))
  useEffect(() => {
    if (design?.status !== 'checking' || !(left > 0)) return
    const t = setTimeout(() => setNow(Date.now()), left + 100)
    return () => clearTimeout(t)
  }, [design?.status, left])
  const coverMe = (
    <div className="design-card">
      <label className="design-option">
        <input type="radio" name="layout" checked={!yours} onChange={() => onPick('cover-me')} />
        <span>
          <span className="design-option-title">Cover Me layout</span>
          <span className="design-option-desc">Clean ATS layout. Adds a summary, compact to one page, Word or PDF.</span>
        </span>
      </label>
      <Reveal shown={!yours}><TemplateSetting /></Reveal>
    </div>
  )
  const waiting = (status: ReactNode) => (
    <fieldset className="design-choice">
      <legend className="design-legend">Tailored resumes use</legend>
      {coverMe}
      {status}
    </fieldset>
  )
  if (!design) {
    return (
      <fieldset className="design-choice">
        <legend className="design-legend">Tailored resumes use</legend>
        {coverMe}
        <div className="design-card disabled">
          <div className="design-option">
            <input type="radio" name="layout" disabled />
            <span>
              <span className="design-option-title">Your design (Beta)</span>
              {/* A .docx name with no file here: synced from another computer, or uploaded before #131. */}
              <span className="design-option-desc">
                {wordUpload
                  ? "This browser doesn't have your Word file. Upload it again here to keep its design."
                  : 'Needs your resume as a Word file (.docx). From Google Docs, use File, Download, Microsoft Word.'}
              </span>
            </span>
          </div>
          <div className="design-readout">
            <button type="button" className="upload-link design-retry" onClick={onUpload}>{wordUpload ? 'Upload it again' : 'Upload a Word file'}</button>
          </div>
        </div>
      </fieldset>
    )
  }
  const stale = design.status === 'checking' && left <= 0
  if (stale) {
    return waiting(
      <p className="hint">
        Checking your design didn&apos;t finish.{' '}
        <button type="button" className="upload-link design-retry" onClick={onRetry}>Try again</button>
      </p>,
    )
  }
  if (design.status === 'checking') {
    return waiting(<p className="design-checking" role="status"><span className="spinner design-spinner" aria-hidden />Checking your design…</p>)
  }
  if (design.status === 'error' || !design.check) {
    return waiting(
      <p className="hint">
        {design.error ?? "Couldn't check your design."}{' '}
        {/* A check again would upload this browser's text over the account's resume (#174). */}
        {!design.refused && <button type="button" className="upload-link design-retry" onClick={onRetry}>Try again</button>}
      </p>,
    )
  }
  const c = design.check
  const usable = designUsable(c)
  return (
    <fieldset className="design-choice">
      <legend className="design-legend">Tailored resumes use</legend>
      <div className={`design-card${usable ? '' : ' disabled'}`}>
        <label className="design-option">
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
        <Reveal shown={yours || !usable}>
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
        </Reveal>
      </div>
      {coverMe}
    </fieldset>
  )
}
