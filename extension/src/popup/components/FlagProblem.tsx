import { useEffect, useRef, useState } from 'react'
import { ensureValidSession } from '../../lib/auth'
import { SUPABASE_URL } from '../../lib/config'
import { buildGenerationReport, MAX_COMMENT, REPORT_CATEGORIES, sendGenerationReport, type ReportCategory, type ReportTarget } from '../../lib/generation-report'
import { getMode, getResume, getSession, getSettings } from '../../lib/storage'

// "Flag a problem" (#256): under a letter in the popup, in the editor tab's top
// bar for a resume. Opens a short form; one Send adds one report. After that
// it reads "Reported. Thanks." for this result (give each result its own key).
// Builds without a backend have nothing to send to, so they show nothing.
export default function FlagProblem({ target }: { target: ReportTarget }) {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<ReportCategory | null>(null)
  const [comment, setComment] = useState('')
  const [sendSource, setSendSource] = useState(false)
  const [contact, setContact] = useState(false)
  const [canContact, setCanContact] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [reported, setReported] = useState(false)
  const form = useRef<HTMLFormElement>(null)
  const done = useRef<HTMLButtonElement>(null)

  // Only a signed-in Hosted user has an account we could email.
  useEffect(() => {
    if (!open) return
    void Promise.all([getMode(), getSession()]).then(([mode, session]) => setCanContact(mode === 'hosted' && !!session))
    form.current?.querySelector('input')?.focus()
  }, [open])
  useEffect(() => { if (reported) done.current?.focus() }, [reported])

  if (!SUPABASE_URL) return null

  const thing = target.kind === 'letter' ? 'letter' : 'resume'
  const ready = category && (category !== 'other' || comment.trim())

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!ready) return
    setSending(true)
    setError('')
    try {
      const [mode, settings, resume] = await Promise.all([getMode(), getSettings(), getResume()])
      const report = buildGenerationReport(target, { category, comment, sendSource, contact: canContact && contact }, {
        mode, provider: settings?.provider ?? 'claude', version: chrome.runtime.getManifest().version, resume,
      })
      const token = report.contact ? (await ensureValidSession())?.access_token : undefined
      if (report.contact && !token) {
        setError('Sign in again so we can email you, or untick that box.')
        return
      }
      await sendGenerationReport(report, token)
      setOpen(false)
      setReported(true)
    } catch {
      setError("Couldn't send the report. Try again in a moment.")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flag">
      <button type="button" ref={done} className="text-link flag-link" disabled={reported} aria-expanded={open}
        onClick={() => setOpen((o) => !o)}>
        {reported ? 'Reported. Thanks.' : 'Flag a problem'}
      </button>
      {open && (
        <form className="flag-form" ref={form} onSubmit={submit} onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false) }}>
          <fieldset>
            <legend className="form-label">What was wrong with this {thing}?</legend>
            {REPORT_CATEGORIES.map((c) => (
              <label key={c.key} className="compact-toggle">
                <input type="radio" name="flag-category" checked={category === c.key} onChange={() => setCategory(c.key)} />
                {c.label}
              </label>
            ))}
          </fieldset>
          {category === 'invented' && (
            <label className="compact-toggle">
              <input type="checkbox" checked={sendSource} onChange={(e) => setSendSource(e.target.checked)} />
              Also send my original resume so we can check
            </label>
          )}
          <label className="flag-comment">
            <span className="form-label">{category === 'other' ? 'What happened?' : 'Anything else? (optional)'}</span>
            <textarea className="form-input" maxLength={MAX_COMMENT} value={comment} onChange={(e) => setComment(e.target.value)} />
          </label>
          {canContact && (
            <label className="compact-toggle">
              <input type="checkbox" checked={contact} onChange={(e) => setContact(e.target.checked)} />
              You can email me about this
            </label>
          )}
          <p className="hint">
            Sends this {thing}{target.kind === 'resume' && ' and its ATS score'}, the job&apos;s title, company, description and
            site name, your answers, and which AI wrote it.
            {category === 'invented' && sendSource && ' Also your original resume.'}
            {' '}Your contact details are taken out first.
            {canContact && contact ? ' Your account goes with it so we can reply.' : " It isn't linked to you."}
          </p>
          {error && <p className="scrape-failure-error" role="alert">{error}</p>}
          <div className="flag-actions">
            <button type="submit" className="btn btn-secondary btn-sm" disabled={!ready || sending}>{sending ? 'Sending…' : 'Send'}</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  )
}
