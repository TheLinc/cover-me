import { useEffect, useRef, useState } from 'react'
import { downloadCoverLetterPdf } from '../../lib/pdf'
import type { AuthSession, GenerateResponse, JobData, Settings } from '../../types'
import logoIcon from '../../public/icon/48.png'
import type { Page } from '../App'

type State = 'idle' | 'loading' | 'done' | 'error'
type InputMode = 'auto' | 'manual'

interface Props {
  onNavigate: (page: Page) => void
}

export default function GeneratePage({ onNavigate }: Props) {
  const [state, setState] = useState<State>('idle')
  const [inputMode, setInputMode] = useState<InputMode>('auto')
  const [letter, setLetter] = useState('')
  const [job, setJob] = useState<JobData | null>(null)
  const [createdAt, setCreatedAt] = useState('')
  const [error, setError] = useState('')
  const [errorCode, setErrorCode] = useState<'RATE_LIMIT' | undefined>()
  const [copied, setCopied] = useState(false)

  const [manualTitle, setManualTitle] = useState('')
  const [manualCompany, setManualCompany] = useState('')
  const [manualDescription, setManualDescription] = useState('')

  // null = still loading from storage
  const [hasResume, setHasResume] = useState<boolean | null>(null)
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null)
  const [hasSession, setHasSession] = useState<boolean | null>(null)
  const [appMode, setAppMode] = useState<'byok' | 'hosted'>('byok')

  const loaded = useRef(false)

  useEffect(() => {
    chrome.storage.local.get(['generatePage', 'resume', 'settings', 'session']).then((r) => {
      const storedSettings = r.settings as Settings | undefined
      setHasResume(!!r.resume)
      setHasApiKey(!!(storedSettings?.apiKey))
      setHasSession(!!(r.session as AuthSession | undefined)?.access_token)
      setAppMode(storedSettings?.mode ?? 'byok')

      const s = r.generatePage as Record<string, unknown> | undefined
      if (s) {
        if (s.inputMode) setInputMode(s.inputMode as InputMode)
        if (s.manualTitle) setManualTitle(s.manualTitle as string)
        if (s.manualCompany) setManualCompany(s.manualCompany as string)
        if (s.manualDescription) setManualDescription(s.manualDescription as string)
        if (s.state === 'done' && s.letter && s.job && s.createdAt) {
          setLetter(s.letter as string)
          setJob(s.job as JobData)
          setCreatedAt(s.createdAt as string)
          setState('done')
        }
      }
      loaded.current = true
    })
  }, [])

  useEffect(() => {
    if (!loaded.current) return
    if (state === 'loading' || state === 'error') return
    chrome.storage.local.set({
      generatePage: { state, inputMode, manualTitle, manualCompany, manualDescription, letter, job, createdAt },
    })
  }, [state, inputMode, manualTitle, manualCompany, manualDescription, letter, job, createdAt])

  async function generate() {
    setState('loading')
    setError('')
    setErrorCode(undefined)
    try {
      const res = (await chrome.runtime.sendMessage({ type: 'GENERATE_FROM_TAB' })) as GenerateResponse
      if (res.success) {
        setLetter(res.letter)
        setJob(res.job)
        setCreatedAt(new Date().toISOString())
        setState('done')
      } else {
        setError(res.error)
        setErrorCode(res.errorCode)
        setState('error')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setState('error')
    }
  }

  async function generateManual() {
    setState('loading')
    setError('')
    setErrorCode(undefined)
    const jobData: JobData = {
      title: manualTitle.trim(),
      company: manualCompany.trim() || 'Unknown Company',
      description: manualDescription.trim(),
      url: '',
    }
    try {
      const res = (await chrome.runtime.sendMessage({
        type: 'GENERATE_FROM_MANUAL',
        job: jobData,
      })) as GenerateResponse
      if (res.success) {
        setLetter(res.letter)
        setJob(res.job)
        setCreatedAt(new Date().toISOString())
        setState('done')
      } else {
        setError(res.error)
        setErrorCode(res.errorCode)
        setState('error')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setState('error')
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(letter)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function downloadPdf() {
    if (job) downloadCoverLetterPdf(letter, job, createdAt)
  }

  function resetToNew() {
    setState('idle')
    setInputMode('auto')
    setLetter('')
    setJob(null)
    setCreatedAt('')
    setManualTitle('')
    setManualCompany('')
    setManualDescription('')
  }

  const manualReady = manualTitle.trim().length > 0 && manualDescription.trim().length > 0
  const isReady = appMode === 'hosted' ? hasSession === true : hasApiKey === true
  const setupComplete = hasResume === true && isReady
  const setupLoaded = hasResume !== null && hasApiKey !== null && hasSession !== null

  return (
    <div className="page">
      <div className="page-header">
        <div className="logo">
          <img src={logoIcon} width="26" height="26" alt="" className="logo-icon" />
          <span className="logo-text">Cover Me</span>
        </div>
        <p className="page-subtitle">AI-powered cover letters in seconds</p>
      </div>

      {/* Don't render anything until we know setup state — avoids flash */}
      {!setupLoaded && null}

      {setupLoaded && !setupComplete && (
        <div className="setup-checklist">
          <div className="setup-heading">Quick setup</div>
          <p className="setup-sub">Complete these two steps before generating your first letter.</p>

          <button
            className={`setup-step${hasResume ? ' done' : ''}`}
            onClick={() => !hasResume && onNavigate('resume')}
          >
            <div className="setup-step-icon">
              {hasResume ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              )}
            </div>
            <div className="setup-step-text">
              <div className="setup-step-title">Upload your resume</div>
              <div className="setup-step-hint">PDF or DOCX — used to tailor every letter</div>
            </div>
            {!hasResume && (
              <svg className="setup-step-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            )}
          </button>

          <button
            className={`setup-step${isReady ? ' done' : ''}`}
            onClick={() => !isReady && onNavigate('settings')}
          >
            <div className="setup-step-icon">
              {isReady ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              )}
            </div>
            <div className="setup-step-text">
              {appMode === 'hosted' ? (
                <>
                  <div className="setup-step-title">Sign in to Cover Me</div>
                  <div className="setup-step-hint">Free account — 10 letters/day</div>
                </>
              ) : (
                <>
                  <div className="setup-step-title">Add your API key</div>
                  <div className="setup-step-hint">Claude or OpenAI — stays on your device</div>
                </>
              )}
            </div>
            {!isReady && (
              <svg className="setup-step-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            )}
          </button>
        </div>
      )}

      {setupLoaded && setupComplete && (
        <>
          {state === 'idle' && inputMode === 'auto' && (
            <div className="generate-cta">
              <button className="btn btn-primary" onClick={generate}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                Generate Cover Letter
              </button>
              <p className="generate-hint">
                Open a job posting on LinkedIn, Indeed, or any careers page, then click Generate.
              </p>
              <button className="manual-toggle" onClick={() => setInputMode('manual')}>
                Can't detect the posting? Paste it manually →
              </button>
            </div>
          )}

          {state === 'idle' && inputMode === 'manual' && (
            <div className="manual-form">
              <div className="form-group">
                <label className="form-label">Job Title *</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. Senior Software Engineer"
                  value={manualTitle}
                  onChange={e => setManualTitle(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Company Name</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. Acme Corp (optional)"
                  value={manualCompany}
                  onChange={e => setManualCompany(e.target.value)}
                />
              </div>
              <div className="form-group manual-description-group">
                <label className="form-label">Job Description *</label>
                <textarea
                  className="form-input manual-description"
                  placeholder="Paste the full job description here…"
                  value={manualDescription}
                  onChange={e => setManualDescription(e.target.value)}
                />
              </div>
              <button className="btn btn-primary" onClick={generateManual} disabled={!manualReady}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                Generate Cover Letter
              </button>
              <button className="manual-toggle" onClick={() => setInputMode('auto')}>
                ← Back to auto-detect
              </button>
            </div>
          )}

          {state === 'loading' && (
            <div className="centered">
              <div className="spinner" />
              <p className="loading-text">Reading the job posting and crafting your letter…</p>
            </div>
          )}

          {state === 'error' && (
            <div className="letter-container">
              <div className={errorCode === 'RATE_LIMIT' ? 'warning-box' : 'error-box'}>
                {error}
              </div>
              {errorCode !== 'RATE_LIMIT' && (
                <button className="btn btn-secondary" onClick={() => setState('idle')}>
                  Try Again
                </button>
              )}
            </div>
          )}

          {state === 'done' && (
            <div className="letter-container">
              <div className="letter-box">
                <textarea
                  className="letter-textarea"
                  value={letter}
                  onChange={e => setLetter(e.target.value)}
                  spellCheck={false}
                />
              </div>
              <div className="letter-actions">
                <button className="btn btn-primary" onClick={copy}>
                  {copied ? (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
                <button className="btn btn-secondary" style={{ width: 'auto', padding: '10px 14px' }} onClick={downloadPdf}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  PDF
                </button>
                <button className="btn btn-ghost" onClick={resetToNew}>
                  New
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
