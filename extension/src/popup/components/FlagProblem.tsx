import { Fragment, useEffect, useRef, useState } from 'react'
import { ensureValidSession } from '../../lib/auth'
import { SUPABASE_URL } from '../../lib/config'
import { buildGenerationReport, MAX_COMMENT, MAX_LETTER, rememberReportedResult, REPORT_CATEGORIES, reportedResults, resumeTexts, sendGenerationReport, withResumeText, type GenerationReport, type ReportCategory, type ReportTarget } from '../../lib/generation-report'
import { readResumeForReport } from '../../lib/report-resume'
import { getMode, getResume, getSession, getSettings } from '../../lib/storage'

// "Flag a problem" (#256): under a letter in the popup, in the editor tab's top
// bar for a resume. Opens a short form, then shows what will be sent with the
// user's details taken out, editable; Send adds one report. After that
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
  // Built by Next, edited in the preview, sent by Send.
  const [report, setReport] = useState<GenerationReport | null>(null)
  const [error, setError] = useState('')
  const [reported, setReported] = useState(false)
  const form = useRef<HTMLFormElement>(null)
  const link = useRef<HTMLButtonElement>(null)
  const submitted = useRef(false)
  // Bumped by close(), so a Next still reading when the form closed is dropped.
  const attempt = useRef(0)

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
  // Next and Back swap the questions and the preview: focus the first box.
  const previewing = !!report
  useEffect(() => { form.current?.querySelector(previewing ? 'textarea' : 'input')?.focus() }, [previewing])
  // After a send the form is gone: focus the link, which now reads the thanks.
  useEffect(() => { if (reported && submitted.current) link.current?.focus() }, [reported])

  if (!SUPABASE_URL) return null

  // The form goes away with focus inside it: keep focus on the link.
  function close() {
    attempt.current++
    setOpen(false)
    setReport(null)
    setError('')
    link.current?.focus()
  }

  // A letter edited down to nothing has nothing to report (the server refuses it).
  const ready = category && (category !== 'other' || comment.trim()) && (target.kind !== 'letter' || target.output.trim())

  async function next(e: React.FormEvent) {
    e.preventDefault()
    if (!ready) return
    setSending('reading')
    setError('')
    const at = attempt.current
    const [mode, settings] = await Promise.all([getMode(), getSettings()])
    const session = mode === 'hosted' ? await ensureValidSession() : null
    // The user's parsed resume names their details, so the report can leave
    // them out. Nothing is sent without it.
    try {
      const parsed = await readResumeForReport(mode, settings, session)
      if (at !== attempt.current) return
      setReport(buildGenerationReport(target, { category, comment, sendSource, contact: canContact && contact }, {
        mode, provider: settings?.provider ?? 'claude', version: chrome.runtime.getManifest().version, parsed, accountEmail: session?.user.email,
      }))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSending('')
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!report) return
    setSending('sending')
    setError('')
    try {
      // Told "Your account goes with it": no session, no send.
      const token = report.contact ? (await ensureValidSession())?.access_token : undefined
      if (report.contact && !token) throw new Error('signed out')
      await sendGenerationReport(report, token)
      await rememberReportedResult(resultKey)
      submitted.current = true
      close()
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
        onClick={() => { if (reported) return; if (open) close(); else setOpen(true) }}>
        {reported ? 'Reported. Thanks.' : 'Flag a problem'}
      </button>
      {open && (
        <form className="flag-form" ref={form} onSubmit={report ? send : next} onKeyDown={(e) => { if (e.key === 'Escape' && !report) close() }}>
          {report ? <Preview report={report} onChange={setReport} /> : <>
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
              {' '}Next shows it with your details taken out, to check before you send.
              {canContact && contact ? ' Your account goes with it so we can reply.' : " It isn't linked to you."}
            </p>
          </>}
          {error && <p className="scrape-failure-error" role="alert">{error}</p>}
          <div className="flag-actions">
            {report
              ? <button type="submit" className="btn btn-secondary btn-sm" disabled={!!sending || (typeof report.output === 'string' && !report.output.trim())}>{sending ? 'Sending…' : 'Send'}</button>
              : <button type="submit" className="btn btn-secondary btn-sm" disabled={!ready || !!sending}>{sending ? 'Taking your details out…' : 'Next'}</button>}
            {report && <button type="button" className="btn btn-ghost btn-sm" disabled={!!sending} onClick={() => { setReport(null); setError('') }}>Back</button>}
            <button type="button" className="btn btn-ghost btn-sm" disabled={sending === 'sending'} onClick={close}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  )
}

// What Send sends, editable: the letter, or each text of the resume (and of
// the original resume, when it goes too).
function Preview({ report, onChange }: { report: GenerationReport; onChange: (r: GenerationReport) => void }) {
  // Each box under a heading for where it sits ("experience 1 bullets"),
  // shown when that changes.
  const name = (path: Array<string | number>) => path.map((p) => (typeof p === 'number' ? p + 1 : p)).join(' ')
  const fields = (key: 'output' | 'sourceResume') => resumeTexts(report[key] as object).map(({ path, text }, i, all) => {
    const where = name(path.slice(0, -1)) || name(path)
    const heading = i === 0 || where !== (name(all[i - 1].path.slice(0, -1)) || name(all[i - 1].path))
    return (
      <Fragment key={path.join('.')}>
        {heading && <span className="hint flag-where">{where}</span>}
        <textarea className="form-input" aria-label={name(path)} rows={Math.min(4, Math.ceil(text.length / 44) || 1)} value={text}
          onChange={(e) => onChange({ ...report, [key]: withResumeText(report[key] as Record<string, unknown>, path, e.target.value) })} />
      </Fragment>
    )
  })
  return (
    <>
      <p className="form-label">Your {report.kind} as we&apos;ll send it</p>
      <p className="hint">Your name, email, phone, links and city are taken out, and so is any email, phone number or address starting with http or www. Delete anything else you don&apos;t want to share, like a street address or someone else&apos;s name. Your comment goes as you wrote it.</p>
      {typeof report.output === 'string'
        ? <textarea className="form-input flag-preview" aria-label={`The ${report.kind} we'll send`} maxLength={MAX_LETTER} value={report.output} onChange={(e) => onChange({ ...report, output: e.target.value })} />
        : <div className="flag-preview" role="group" aria-label="The resume we'll send">{fields('output')}</div>}
      {report.sourceResume && <>
        <p className="form-label">Your original resume</p>
        <div className="flag-preview" role="group" aria-label="Your original resume">{fields('sourceResume')}</div>
      </>}
    </>
  )
}
