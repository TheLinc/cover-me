import { useEffect, useRef, useState } from 'react'
import { ensureValidSession } from '../../lib/auth'
import { SUPABASE_URL } from '../../lib/config'
import { buildGenerationReport, MAX_COMMENT, rememberReportedResult, REPORT_CATEGORIES, reportedResults, sendGenerationReport, type ReportCategory, type ReportTarget } from '../../lib/generation-report'
import { readResumeForReport } from '../../lib/report-resume'
import { getMode, getResume, getSession, getSettings } from '../../lib/storage'

// "Flag a problem" (#256): under a letter in the popup, in the editor tab's top
// bar for a resume. Opens a short form; one Send adds one report. After that
// it reads "Reported. Thanks." for this result, also after the popup or tab is
// reopened. resultKey: what names the result (a letter's time, a resume's ID);
// give each result its own React key too. Builds without a backend have
// nothing to send to, so they show nothing.
export default function FlagProblem({ target, resultKey }: { target: ReportTarget; resultKey: string }) {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<ReportCategory | null>(null)
  const [comment, setComment] = useState('')
  const [sendSource, setSendSource] = useState(false)
  const [contact, setContact] = useState(false)
  const [canContact, setCanContact] = useState(false)
  const [hasResume, setHasResume] = useState(false)
  const [sending, setSending] = useState<'' | 'reading' | 'sending'>('')
  const [error, setError] = useState('')
  const [reported, setReported] = useState(false)
  const form = useRef<HTMLFormElement>(null)
  const link = useRef<HTMLButtonElement>(null)
  const submitted = useRef(false)

  useEffect(() => {
    void reportedResults().then((keys) => { if (keys.includes(resultKey)) setReported(true) })
  }, [resultKey])

  // Only a signed-in Hosted user has an account we could email, and the
  // original resume can go only when this browser has one.
  useEffect(() => {
    if (!open) return
    void Promise.all([getMode(), getSession(), getResume()]).then(([mode, session, resume]) => {
      setCanContact(mode === 'hosted' && !!session)
      setHasResume(!!resume?.text)
    })
    form.current?.querySelector('input')?.focus()
  }, [open])
  // After a send the form is gone: focus the link, which now reads the thanks.
  useEffect(() => { if (reported && submitted.current) link.current?.focus() }, [reported])

  if (!SUPABASE_URL) return null

  // The form goes away with focus inside it: keep focus on the link.
  function close() {
    setOpen(false)
    link.current?.focus()
  }

  // A letter edited down to nothing has nothing to report (the server refuses it).
  const ready = category && (category !== 'other' || comment.trim()) && (target.kind !== 'letter' || target.output.trim())

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!ready) return
    setSending('reading')
    setError('')
    const [mode, settings] = await Promise.all([getMode(), getSettings()])
    const session = mode === 'hosted' ? await ensureValidSession() : null
    // The user's parsed resume names their details, so the report can leave
    // them out. Nothing is sent without it.
    let parsed
    try {
      parsed = await readResumeForReport(mode, settings, session)
    } catch (err) {
      setError((err as Error).message)
      setSending('')
      return
    }
    setSending('sending')
    try {
      const report = buildGenerationReport(target, { category, comment, sendSource, contact: canContact && contact }, {
        mode, provider: settings?.provider ?? 'claude', version: chrome.runtime.getManifest().version, parsed, accountEmail: session?.user.email,
      })
      await sendGenerationReport(report, report.contact ? session?.access_token : undefined)
      await rememberReportedResult(resultKey)
      submitted.current = true
      setOpen(false)
      setReported(true)
    } catch {
      setError("Couldn't send the report. Try again in a moment.")
    } finally {
      setSending('')
    }
  }

  return (
    <div className="flag">
      {/* aria-disabled, not disabled: it keeps focus after a send, so the thanks is read out. */}
      <button type="button" ref={link} className="text-link flag-link" aria-disabled={reported} aria-expanded={reported ? undefined : open}
        onClick={() => { if (!reported) setOpen((o) => !o) }}>
        {reported ? 'Reported. Thanks.' : 'Flag a problem'}
      </button>
      {open && (
        <form className="flag-form" ref={form} onSubmit={submit} onKeyDown={(e) => { if (e.key === 'Escape') close() }}>
          <fieldset>
            <legend className="form-label">What was wrong with this {target.kind}?</legend>
            {REPORT_CATEGORIES.map((c) => (
              <label key={c.key} className="compact-toggle">
                <input type="radio" name="flag-category" checked={category === c.key} onChange={() => { setCategory(c.key); setSendSource(false) }} />
                {c.label}
              </label>
            ))}
          </fieldset>
          {category === 'invented' && hasResume && (
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
            Sends this {target.kind}{target.kind === 'resume' && ' with its ATS score and gaps, marked if you edited it'}, the
            job&apos;s title, company, description and site name, your answers, whether you use Hosted or your own key,
            which AI wrote it and the extension&apos;s version.
            {category === 'invented' && hasResume && sendSource && ' Also your original resume, as Cover Me read it (its sections and jobs).'}
            {' '}Your name, email, phone, links, location and address are taken out first; your comment goes as you wrote it.
            {canContact && contact ? ' Your account goes with it so we can reply.' : " It isn't linked to you."}
          </p>
          {error && <p className="scrape-failure-error" role="alert">{error}</p>}
          <div className="flag-actions">
            <button type="submit" className="btn btn-secondary btn-sm" disabled={!ready || !!sending}>{sending === 'reading' ? 'Taking your details out…' : sending ? 'Sending…' : 'Send'}</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={close}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  )
}
