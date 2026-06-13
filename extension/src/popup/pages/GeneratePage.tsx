import { useEffect, useRef, useState } from 'react'
import { downloadCoverLetterPdf } from '../../lib/pdf'
import { downloadTailoredResumePdf } from '../../lib/resume-pdf'
import type { AuthSession, GenerateResponse, JobData, Settings, ScrapeResponse, TailorResponse, TailoredResume } from '../../types'
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

  type TailorState = 'idle' | 'loading' | 'done' | 'error'
  const [tailorState, setTailorState] = useState<TailorState>('idle')
  const [tailorError, setTailorError] = useState('')
  const [tailoredResume, setTailoredResume] = useState<TailoredResume | null>(null)
  const [tailoredJob, setTailoredJob] = useState<JobData | null>(null)
  const [supplemental, setSupplemental] = useState('')
  const [compact, setCompact] = useState(false)
  const [trim, setTrim] = useState(false)
  const [includeSummary, setIncludeSummary] = useState(true)
  const [loadingJob, setLoadingJob] = useState<JobData | null>(null)

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
        if (typeof s.compact === 'boolean') setCompact(s.compact)
        if (typeof s.trim === 'boolean') setTrim(s.trim)
        if (typeof s.includeSummary === 'boolean') setIncludeSummary(s.includeSummary)
        if (s.state === 'done' && s.letter && s.job && s.createdAt) {
          setLetter(s.letter as string)
          setJob(s.job as JobData)
          setCreatedAt(s.createdAt as string)
          setState('done')
        }
        if (s.tailorState === 'done' && s.tailoredResume && s.tailoredJob) {
          setTailoredResume(s.tailoredResume as TailoredResume)
          setTailoredJob(s.tailoredJob as JobData)
          setSupplemental((s.supplemental as string) ?? '')
          setTailorState('done')
        }
      }
      loaded.current = true
    })
  }, [])

  useEffect(() => {
    if (!loaded.current) return
    if (state === 'loading' || state === 'error') return
    if (tailorState === 'loading') return
    chrome.storage.local.set({
      generatePage: {
        state, inputMode, manualTitle, manualCompany, manualDescription, letter, job, createdAt,
        compact, trim, includeSummary,
        tailorState: tailorState === 'done' ? 'done' : 'idle',
        tailoredResume: tailorState === 'done' ? tailoredResume : null,
        tailoredJob: tailorState === 'done' ? tailoredJob : null,
        supplemental,
      },
    })
  }, [state, inputMode, manualTitle, manualCompany, manualDescription, letter, job, createdAt, compact, trim, includeSummary, tailorState, tailoredResume, tailoredJob, supplemental])

  async function generate() {
    setState('loading')
    setLoadingJob(null)
    setError('')
    setErrorCode(undefined)
    // Step 1: scrape so we can show job details immediately
    let scrapedJob: JobData
    try {
      const scrape = (await chrome.runtime.sendMessage({ type: 'SCRAPE_TAB' })) as ScrapeResponse
      if (!scrape.success) { setError(scrape.error); setState('error'); return }
      scrapedJob = scrape.job
      setLoadingJob(scrapedJob)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read this page.')
      setState('error')
      return
    }
    // Step 2: generate
    try {
      const res = (await chrome.runtime.sendMessage({ type: 'GENERATE_FROM_MANUAL', job: scrapedJob })) as GenerateResponse
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
    const jobData: JobData = {
      title: manualTitle.trim(),
      company: manualCompany.trim() || 'Unknown Company',
      description: manualDescription.trim(),
      url: '',
    }
    setState('loading')
    setLoadingJob(jobData)
    setError('')
    setErrorCode(undefined)
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

  async function tailor() {
    setTailorState('loading')
    setLoadingJob(null)
    setTailorError('')
    // Step 1: scrape so we can show job details immediately
    let scrapedJob: JobData
    try {
      const scrape = (await chrome.runtime.sendMessage({ type: 'SCRAPE_TAB' })) as ScrapeResponse
      if (!scrape.success) { setTailorError(scrape.error); setTailorState('error'); return }
      scrapedJob = scrape.job
      setLoadingJob(scrapedJob)
    } catch (err) {
      setTailorError(err instanceof Error ? err.message : 'Could not read this page.')
      setTailorState('error')
      return
    }
    // Step 2: tailor
    try {
      const res = (await chrome.runtime.sendMessage({ type: 'TAILOR_FROM_MANUAL', job: scrapedJob, compact, trim, includeSummary })) as TailorResponse
      if (res.success) {
        setTailoredResume(res.resume)
        setTailoredJob(res.job)
        setTailorState('done')
      } else {
        setTailorError(res.error)
        setTailorState('error')
      }
    } catch (err) {
      setTailorError(err instanceof Error ? err.message : 'Something went wrong')
      setTailorState('error')
    }
  }

  async function tailorManual() {
    const jobData: JobData = {
      title: manualTitle.trim(),
      company: manualCompany.trim() || 'Unknown Company',
      description: manualDescription.trim(),
      url: '',
    }
    setTailorState('loading')
    setLoadingJob(jobData)
    setTailorError('')
    try {
      const res = (await chrome.runtime.sendMessage({
        type: 'TAILOR_FROM_MANUAL',
        job: jobData,
        compact,
        trim,
        includeSummary,
      })) as TailorResponse
      if (res.success) {
        setTailoredResume(res.resume)
        setTailoredJob(res.job)
        setTailorState('done')
      } else {
        setTailorError(res.error)
        setTailorState('error')
      }
    } catch (err) {
      setTailorError(err instanceof Error ? err.message : 'Something went wrong')
      setTailorState('error')
    }
  }

  function resetTailor() {
    setTailorState('idle')
    setTailoredResume(null)
    setTailoredJob(null)
    setSupplemental('')
  }

  async function regenerate() {
    if (!tailoredJob) return
    setTailorState('loading')
    setLoadingJob(tailoredJob)
    setTailoredResume(null)
    setTailorError('')
    try {
      const res = (await chrome.runtime.sendMessage({
        type: 'TAILOR_FROM_MANUAL',
        job: tailoredJob,
        compact,
        trim,
        includeSummary,
        supplemental: supplemental.trim() || undefined,
      })) as TailorResponse
      if (res.success) {
        setTailoredResume(res.resume)
        setTailoredJob(res.job)
        setTailorState('done')
      } else {
        setTailorError(res.error)
        setTailorState('error')
      }
    } catch (err) {
      setTailorError(err instanceof Error ? err.message : 'Something went wrong')
      setTailorState('error')
    }
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
        <p className="page-subtitle">AI-powered cover letters &amp; resume tailoring</p>
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
                  <div className="setup-step-hint">Free account — 10 generations/day</div>
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
          {tailorState === 'loading' && (
            <div className="centered">
              <div className="spinner" />
              <p className="loading-text">
                {loadingJob ? 'Tailoring your resume…' : 'Reading the job posting…'}
              </p>
              {loadingJob && (
                <div className="loading-job-preview">
                  <div className="loading-job-title">{loadingJob.title}</div>
                  <div className="loading-job-org">{loadingJob.company}</div>
                  <p className="loading-job-snippet">{loadingJob.description.slice(0, 160).trim()}…</p>
                </div>
              )}
            </div>
          )}

          {tailorState === 'error' && (
            <div className="letter-container">
              <div className="error-box">{tailorError}</div>
              <button className="btn btn-secondary" onClick={resetTailor}>
                Try Again
              </button>
            </div>
          )}

          {tailorState === 'done' && tailoredResume && (
            <div className="letter-container">
              {tailoredJob && (
                <div className="tailor-result-job">
                  <div className="tailor-result-role">{tailoredJob.title}</div>
                  <div className="tailor-result-company">{tailoredJob.company}</div>
                </div>
              )}
              <div className="ats-result">
                <div className="ats-score-row">
                  <span className="ats-label">ATS Score</span>
                  <span className={`ats-badge ${
                    tailoredResume.atsScore === undefined ? 'ats-badge-amber' :
                    tailoredResume.atsScore >= 80 ? 'ats-badge-green' :
                    tailoredResume.atsScore >= 60 ? 'ats-badge-amber' : 'ats-badge-red'
                  }`}>
                    {tailoredResume.atsScore ?? '—'}<span className="ats-denom">/100</span>
                  </span>
                </div>
                {tailoredResume.atsGaps && tailoredResume.atsGaps.length > 0 && (
                  <ul className="ats-gaps">
                    {tailoredResume.atsGaps.map((gap, i) => (
                      <li key={i} className="ats-gap">{gap}</li>
                    ))}
                  </ul>
                )}
                {(!tailoredResume.atsGaps || tailoredResume.atsGaps.length === 0) && tailoredResume.atsScore !== undefined && tailoredResume.atsScore >= 80 && (
                  <p className="ats-strong">Strong match — no significant gaps detected.</p>
                )}
              </div>
              <div className="supplemental-section">
                <label className="supplemental-label">Missing something?</label>
                <textarea
                  className="form-input supplemental-input"
                  placeholder={'Add real experience not on your resume\ne.g. "2yr GraphQL from freelance, AWS cert in progress"'}
                  value={supplemental}
                  onChange={e => setSupplemental(e.target.value)}
                />
              </div>
              <div className="letter-actions">
                <button
                  className="btn btn-primary"
                  onClick={() => tailoredJob && downloadTailoredResumePdf(tailoredResume, tailoredJob.title)}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download PDF
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={regenerate}
                  disabled={!supplemental.trim()}
                  style={{ width: 'auto', padding: '10px 14px' }}
                >
                  Regenerate
                </button>
                <button className="btn btn-ghost" onClick={resetTailor}>
                  New
                </button>
              </div>
            </div>
          )}

          {tailorState === 'idle' && (
            <>
              {state === 'idle' && inputMode === 'auto' && (
                <div className="generate-cta">
                  <button className="btn btn-primary" onClick={generate}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    Generate Cover Letter
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={tailor}
                    style={{ marginTop: 8 }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                    Tailor Resume to Job
                  </button>
                  <label className="compact-toggle">
                    <input type="checkbox" checked={compact} onChange={e => setCompact(e.target.checked)} />
                    Compact to one page
                  </label>
                  <label className="compact-toggle">
                    <input type="checkbox" checked={trim} onChange={e => setTrim(e.target.checked)} />
                    Remove irrelevant bullets
                    <span
                      className="tooltip-icon"
                      data-tooltip="Best for long master resumes with all your experience — the AI selects only the bullets most relevant to the role being applied for."
                    >?</span>
                  </label>
                  <label className="compact-toggle">
                    <input type="checkbox" checked={includeSummary} onChange={e => setIncludeSummary(e.target.checked)} />
                    Include summary
                    <span
                      className="tooltip-icon"
                      data-tooltip="Adds a 2-3 sentence professional summary tailored to the role. Turn off if your resume already has one or the role prefers none."
                    >?</span>
                  </label>
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
                  <button
                    className="btn btn-secondary"
                    onClick={tailorManual}
                    disabled={!manualReady}
                    style={{ marginTop: 8 }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                    Tailor Resume to Job
                  </button>
                  <label className="compact-toggle">
                    <input type="checkbox" checked={compact} onChange={e => setCompact(e.target.checked)} />
                    Compact to one page
                  </label>
                  <label className="compact-toggle">
                    <input type="checkbox" checked={trim} onChange={e => setTrim(e.target.checked)} />
                    Remove irrelevant bullets
                    <span
                      className="tooltip-icon"
                      data-tooltip="Best for long master resumes with all your experience — the AI selects only the bullets most relevant to the role being applied for."
                    >?</span>
                  </label>
                  <label className="compact-toggle">
                    <input type="checkbox" checked={includeSummary} onChange={e => setIncludeSummary(e.target.checked)} />
                    Include summary
                    <span
                      className="tooltip-icon"
                      data-tooltip="Adds a 2-3 sentence professional summary tailored to the role. Turn off if your resume already has one or the role prefers none."
                    >?</span>
                  </label>
                  <button className="manual-toggle" onClick={() => setInputMode('auto')}>
                    ← Back to auto-detect
                  </button>
                </div>
              )}

              {state === 'loading' && (
                <div className="centered">
                  <div className="spinner" />
                  <p className="loading-text">
                    {loadingJob ? 'Crafting your cover letter…' : 'Reading the job posting…'}
                  </p>
                  {loadingJob && (
                    <div className="loading-job-preview">
                      <div className="loading-job-title">{loadingJob.title}</div>
                      <div className="loading-job-org">{loadingJob.company}</div>
                      <p className="loading-job-snippet">{loadingJob.description.slice(0, 160).trim()}…</p>
                    </div>
                  )}
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
        </>
      )}
    </div>
  )
}
