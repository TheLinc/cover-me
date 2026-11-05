import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ensureValidSession, fetchApplicationsFromBackend, saveResumeEditToBackend } from '../lib/auth'
import { splitSkills } from '../lib/ai/resume-grounding'
import { downloadTailoredResumePdf, tailoredResumePdf } from '../lib/pdf/resume'
import { remainingGaps, saveResumeEdit } from '../lib/resume-edit'
import { getCachedTier, getMode, getTailoredHistory } from '../lib/storage'
import GapChips from '../popup/components/GapChips'
import ScoreRing from '../popup/components/ScoreRing'
import type { AuthSession, TailoredResume } from '../types'

// The editor tab (#118): a form over one tailored resume on the left, the PDF
// it makes on the right. Edits are the user's own, so the grounding checks
// that guard the model's output don't run on them. Saved to local History as
// you type; a Pro account's copy is overwritten too.

interface Opened { scored: TailoredResume; jobTitle: string; company: string }

// A Pro account's session, or null. Checked from what this browser has
// cached first, so BYOK and Free make no network call here.
async function proSession(): Promise<AuthSession | null> {
  if ((await getMode()) !== 'hosted' || (await getCachedTier()) !== 'hosted_pro') return null
  return ensureValidSession()
}

// Local History first; a Pro resume this browser no longer keeps (made on
// another device, or past the 20 kept here) comes from the account.
async function openResume(id: string): Promise<Opened | null> {
  const entry = (await getTailoredHistory()).find((e) => e.id === id)
  if (entry) return { scored: entry.resume, jobTitle: entry.job.title, company: entry.job.company }
  const session = await proSession()
  if (!session) return null
  for (const app of await fetchApplicationsFromBackend(session.access_token)) {
    const tr = app.tailoredResumes.find((t) => t.id === id)
    if (tr) return { scored: tr.resume, jobTitle: app.title, company: app.company }
  }
  return null
}

// The draft as the PDF and History get it: skills joined back into one line,
// and lines left empty dropped.
function finished(draft: TailoredResume, skills: string[]): TailoredResume {
  const lines = (l: string[] | undefined) => l?.filter((s) => s.trim())
  const out: TailoredResume = {
    ...draft,
    experience: draft.experience.map((e) => ({ ...e, bullets: lines(e.bullets) ?? [] })),
    projects: draft.projects?.map((p) => ({ ...p, bullets: lines(p.bullets) ?? [] })),
    education: draft.education.map((e) => ({ ...e, bullets: lines(e.bullets) ?? [] })),
    certifications: lines(draft.certifications),
    otherSections: draft.otherSections?.map((s) => ({ ...s, lines: lines(s.lines) ?? [] })),
    skills: lines(skills)?.map((s) => s.trim()).join(', ') || undefined,
  }
  return out
}

type Status = '' | 'saving' | 'saved' | 'local'

export default function Editor() {
  const id = useMemo(() => new URLSearchParams(location.search).get('id') ?? '', [])
  const [opened, setOpened] = useState<Opened | null | 'loading' | 'error'>('loading')
  const [draft, setDraft] = useState<TailoredResume | null>(null)
  const [skills, setSkills] = useState<string[]>([])
  const [dirty, setDirty] = useState(false)
  const [status, setStatus] = useState<Status>('')
  const [previewUrl, setPreviewUrl] = useState('')

  const unsaved = useRef<TailoredResume | null>(null)
  const saving = useRef<Promise<void>>(Promise.resolve())
  const session = useRef<AuthSession | null>(null)

  useEffect(() => {
    openResume(id).then((o) => {
      setOpened(o)
      if (!o) return
      setDraft(structuredClone(o.scored))
      setSkills(o.scored.skills ? splitSkills(o.scored.skills) : [])
      document.title = `Edit resume · ${o.jobTitle || 'Cover Me'}`
      // Ready for a save as the tab closes, which can't wait for a refresh.
      void proSession().then((s) => { session.current = s }).catch(() => {})
    }).catch(() => setOpened('error'))
  }, [id])

  const scored = typeof opened === 'object' && opened ? opened.scored : null
  const current = useMemo(() => (draft ? finished(draft, skills) : null), [draft, skills])

  // The preview, re-made a moment after typing stops.
  useEffect(() => {
    if (!current) return
    const t = setTimeout(() => {
      const url = URL.createObjectURL(tailoredResumePdf(current).output('blob'))
      setPreviewUrl((old) => { if (old) URL.revokeObjectURL(old); return url })
    }, 300)
    return () => clearTimeout(t)
  }, [current])

  // One save at a time, in order: local History, then the account's copy.
  function save(): Promise<void> {
    saving.current = saving.current.then(async () => {
      const edit = unsaved.current
      if (!edit || !scored) return
      unsaved.current = null
      setStatus('saving')
      const saved = await saveResumeEdit(id, scored, edit)
      try {
        session.current = await proSession()
        if (session.current) await saveResumeEditToBackend(session.current.access_token, id, saved)
        setStatus('saved')
      } catch {
        setStatus('local')
      }
    })
    return saving.current
  }

  useEffect(() => {
    if (!dirty || !current) return
    unsaved.current = current
    const t = setTimeout(save, 800)
    return () => clearTimeout(t)
  }, [current, dirty])

  // Closing the tab mid-edit: save what's left. keepalive lets the account's
  // save finish after the page is gone.
  useEffect(() => {
    function flush() {
      const edit = unsaved.current
      if (!edit || !scored) return
      unsaved.current = null
      void saveResumeEdit(id, scored, edit).then((saved) => {
        if (session.current) void saveResumeEditToBackend(session.current.access_token, id, saved, true).catch(() => {})
      })
    }
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [id, scored])

  function edit(change: (r: TailoredResume) => void) {
    setDraft((d) => {
      const next = structuredClone(d!)
      change(next)
      return next
    })
    setDirty(true)
  }

  async function done() {
    if (current && dirty) unsaved.current = current
    await save()
    window.close()
  }

  if (opened === 'loading') return <main className="ed-message">Opening your resume…</main>
  if (opened === 'error') return <main className="ed-message">Couldn't open this resume. Check your connection and reload the tab.</main>
  if (!opened || !draft || !current || !scored) {
    return <main className="ed-message">This resume isn't in your History anymore.</main>
  }

  const gaps = remainingGaps(scored.atsGaps, current)
  const edited = dirty || !!scored.editedAt

  return (
    <div className="ed">
      <header className="ed-bar">
        <div className="ed-bar-title">
          <h1>Edit resume</h1>
          <p>{[opened.jobTitle, opened.company].filter(Boolean).join(' · ')}</p>
        </div>
        <p className="ed-status" aria-live="polite">
          {status === 'saving' ? 'Saving…'
            : status === 'saved' ? 'Saved'
            : status === 'local' ? "Saved in this browser. Couldn't reach your account, so it'll keep the old version for now."
            : ''}
        </p>
        <button className="btn btn-secondary btn-compact" onClick={() => downloadTailoredResumePdf(current, opened.jobTitle)}>
          Download PDF
        </button>
        <button className="btn btn-primary btn-compact" onClick={done}>Done</button>
      </header>

      <main className="ed-form">
        {(typeof scored.atsScore === 'number' || (scored.atsGaps?.length ?? 0) > 0) && (
          <section className="ats-result" aria-label="ATS result">
            {typeof scored.atsScore === 'number' && <ScoreRing score={scored.atsScore} size={88} />}
            <div className="ats-detail">
              {edited && <p className="ats-edited">Scored before your edits</p>}
              <GapChips gaps={gaps} />
            </div>
          </section>
        )}

        <Section title="Contact">
          <div className="ed-grid">
            <Field label="Name" value={draft.name} onChange={(v) => edit((r) => { r.name = v })} />
            <Field label="Phone" value={draft.phone} onChange={(v) => edit((r) => { r.phone = v })} />
            <Field label="Email" value={draft.email} onChange={(v) => edit((r) => { r.email = v })} />
            <Field label="Website" value={draft.website} onChange={(v) => edit((r) => { r.website = v })} />
          </div>
        </Section>

        {draft.summary !== undefined && (
          <Section title="Summary">
            <Field label="Summary" hideLabel long value={draft.summary} onChange={(v) => edit((r) => { r.summary = v })} />
          </Section>
        )}

        {draft.experience.length > 0 && (
          <Section title="Experience">
            {draft.experience.map((e, i) => (
              <div key={i} className="ed-item">
                <div className="ed-grid">
                  <Field label="Title" value={e.title} onChange={(v) => edit((r) => { r.experience[i].title = v })} />
                  <Field label="Dates" value={e.dates} onChange={(v) => edit((r) => { r.experience[i].dates = v })} />
                  <Field label="Company" value={e.company} onChange={(v) => edit((r) => { r.experience[i].company = v })} />
                  <Field label="Location" value={e.location} onChange={(v) => edit((r) => { r.experience[i].location = v })} />
                </div>
                <Lines label={`Bullets for ${e.title || `job ${i + 1}`}`} noun="bullet" items={e.bullets ?? []}
                  onChange={(l) => edit((r) => { r.experience[i].bullets = l })} />
              </div>
            ))}
          </Section>
        )}

        {(draft.projects?.length ?? 0) > 0 && (
          <Section title="Projects">
            {draft.projects!.map((p, i) => (
              <div key={i} className="ed-item">
                <Field label="Project" value={p.name} onChange={(v) => edit((r) => { r.projects![i].name = v })} />
                <Lines label={`Bullets for ${p.name || `project ${i + 1}`}`} noun="bullet" items={p.bullets ?? []}
                  onChange={(l) => edit((r) => { r.projects![i].bullets = l })} />
              </div>
            ))}
          </Section>
        )}

        {draft.education.length > 0 && (
          <Section title="Education">
            {draft.education.map((e, i) => (
              <div key={i} className="ed-item">
                <div className="ed-grid">
                  <Field label="School" value={e.institution} onChange={(v) => edit((r) => { r.education[i].institution = v })} />
                  <Field label="Dates" value={e.dates} onChange={(v) => edit((r) => { r.education[i].dates = v })} />
                  <Field label="Degree" value={e.degree} onChange={(v) => edit((r) => { r.education[i].degree = v })} />
                  <Field label="Location" value={e.location} onChange={(v) => edit((r) => { r.education[i].location = v })} />
                </div>
                <Lines label={`Bullets for ${e.institution || `school ${i + 1}`}`} noun="bullet" items={e.bullets ?? []}
                  onChange={(l) => edit((r) => { r.education[i].bullets = l })} />
              </div>
            ))}
          </Section>
        )}

        {draft.certifications !== undefined && (
          <Section title="Certifications">
            <Lines label="Certifications" hideLabel noun="certification" items={draft.certifications}
              onChange={(l) => edit((r) => { r.certifications = l })} />
          </Section>
        )}

        {draft.skills !== undefined && (
          <Section title="Skills">
            <Lines label="Skills" hideLabel noun="skill" items={skills} short
              onChange={(l) => { setSkills(l); setDirty(true) }} />
          </Section>
        )}

        {(draft.otherSections ?? []).map((s, i) => (
          <Section key={i} title={s.heading || 'Other'}>
            <Field label="Heading" value={s.heading} onChange={(v) => edit((r) => { r.otherSections![i].heading = v })} />
            <Lines label={`Lines under ${s.heading || 'this section'}`} noun="line" items={s.lines ?? []}
              onChange={(l) => edit((r) => { r.otherSections![i].lines = l })} />
          </Section>
        ))}
      </main>

      <aside className="ed-preview" aria-label="PDF preview">
        {previewUrl && <iframe title="Resume PDF preview" src={`${previewUrl}#toolbar=0&navpanes=0&view=FitH`} />}
      </aside>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="ed-section">
      <h2>{title}</h2>
      {children}
    </section>
  )
}

function Field({ label, value, onChange, long, hideLabel }: { label: string; value: string; onChange: (v: string) => void; long?: boolean; hideLabel?: boolean }) {
  return (
    <label className="ed-field">
      <span className={hideLabel ? 'ed-sr' : 'form-label'}>{label}</span>
      {long
        ? <textarea className="form-input ed-text" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
        : <input className="form-input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />}
    </label>
  )
}

// A list the user can add to, delete from and reorder: bullets, skills,
// certifications, an extra section's lines.
function Lines({ label, noun, items, onChange, hideLabel, short }: {
  label: string; noun: string; items: string[]; onChange: (items: string[]) => void; hideLabel?: boolean; short?: boolean
}) {
  const listRef = useRef<HTMLOListElement>(null)
  const [focusLast, setFocusLast] = useState(false)
  useEffect(() => {
    if (!focusLast) return
    setFocusLast(false)
    listRef.current?.querySelector<HTMLElement>('li:last-child textarea, li:last-child input')?.focus()
  }, [focusLast])

  const move = (i: number, by: number) => {
    const next = [...items]
    ;[next[i], next[i + by]] = [next[i + by], next[i]]
    onChange(next)
  }
  return (
    <fieldset className={`ed-lines${short ? ' ed-lines-short' : ''}`}>
      <legend className={hideLabel ? 'ed-sr' : 'form-label'}>{label}</legend>
      <ol ref={listRef}>
        {items.map((text, i) => (
          <li key={i} className="ed-line">
            {short
              ? <input className="form-input" aria-label={`${noun} ${i + 1}`} value={text} onChange={(e) => onChange(items.map((t, j) => (j === i ? e.target.value : t)))} />
              : <textarea className="form-input ed-text" aria-label={`${noun} ${i + 1}`} value={text} onChange={(e) => onChange(items.map((t, j) => (j === i ? e.target.value : t)))} />}
            <div className="ed-line-tools">
              <button type="button" className="ed-icon" aria-label={`Move ${noun} ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
              <button type="button" className="ed-icon" aria-label={`Move ${noun} ${i + 1} down`} disabled={i === items.length - 1} onClick={() => move(i, 1)}>↓</button>
              <button type="button" className="ed-icon ed-icon-delete" aria-label={`Delete ${noun} ${i + 1}`} onClick={() => onChange(items.filter((_, j) => j !== i))}>×</button>
            </div>
          </li>
        ))}
      </ol>
      <button type="button" className="btn btn-ghost btn-sm ed-add" onClick={() => { onChange([...items, '']); setFocusLast(true) }}>
        Add {noun}
      </button>
    </fieldset>
  )
}
