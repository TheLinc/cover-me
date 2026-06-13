import { useEffect, useRef, useState } from 'react'
import { uploadResumeToBackend } from '../../lib/auth'
import { parseResume } from '../../lib/resume-parser'
import { getResume, getSession, getSettings, saveResume } from '../../lib/storage'
import type { ParsedResume, ResumeData } from '../../types'

type Status = 'idle' | 'parsing' | 'saved' | 'error'

export default function ResumePage() {
  const [resume, setResume] = useState<ResumeData | null>(null)
  const [parsed, setParsed] = useState<ParsedResume | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getResume().then((r) => {
      setResume(r)
      if (r?.parsed) setParsed(r.parsed)
    })
  }, [])

  async function handleFile(file: File) {
    setStatus('parsing')
    setError('')
    setParsed(null) // clear stale parse on new upload
    try {
      const text = await parseResume(file)
      const data: ResumeData = { text, filename: file.name, updatedAt: new Date().toISOString() }
      await saveResume(data)
      setResume(data)
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2500)

      // Best-effort cloud sync for hosted users
      const [settings, session] = await Promise.all([getSettings(), getSession()])
      if (settings?.mode === 'hosted' && session?.access_token) {
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

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Resume</h1>
        <p className="page-subtitle">Upload once — used for every cover letter</p>
      </div>

      <div
        className={`upload-area${dragOver ? ' drag-over' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          className="upload-input"
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
        {status === 'parsing' ? (
          <>
            <div className="spinner" style={{ margin: '0 auto 10px' }} />
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
            <p className="upload-hint">PDF, DOCX, or TXT · Click or drag & drop</p>
          </>
        )}
      </div>

      {status === 'error' && (
        <div className="error-box" style={{ marginTop: 10 }}>{error}</div>
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
        </>
      )}
    </div>
  )
}
